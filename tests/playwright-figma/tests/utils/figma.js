/**
 * Figma API Utilities
 *
 * Wraps the Figma REST API for fetching frame/component images.
 * Uses Node's built-in https/http modules so no extra runtime dependencies
 * are required beyond what is already in package.json.
 *
 * Figma Images API reference:
 * https://www.figma.com/developers/api#get-images-endpoint
 *
 * Rate-limit strategy
 * ───────────────────
 * fetchFigmaImages() batches all node IDs for a given file key into a single
 * API request (up to BATCH_SIZE per call) so a 50-entry config costs 1–2 API
 * calls instead of 50.  figmaApiGet() retries 429 and 5xx responses with
 * exponential backoff, honouring the Retry-After header when present.
 */

const https = require('https');
const http = require('http');

/** Maximum node IDs per Images API request. */
const BATCH_SIZE = 50;

/** Maximum retry attempts on 429 / 5xx responses. */
const MAX_RETRIES = 4;

/**
 * Normalise a Figma node ID to the colon-separated format the API expects.
 * Figma URLs use hyphens (123-456) but the API requires colons (123:456).
 *
 * @param {string} nodeId - Node ID in either "123-456" or "123:456" format.
 * @returns {string} - Node ID in "123:456" format.
 */
function normalizeNodeId(nodeId) {
  return nodeId.replace(/-/g, ':');
}

/**
 * Sleep for `ms` milliseconds.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download a URL and return its body as a Buffer.
 * Follows a single redirect (Figma's image endpoint returns a signed S3 URL).
 *
 * @param {string} url - Absolute URL to fetch.
 * @returns {Promise<Buffer>}
 */
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;

    lib.get(url, (res) => {
      // Follow one redirect (Figma returns a 302 to S3)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadBuffer(res.headers.location).then(resolve).catch(reject);
        res.resume();
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading image: ${url}`));
        res.resume();
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Make a GET request to the Figma REST API with automatic retry on 429 / 5xx.
 * Respects the `Retry-After` response header when present.
 *
 * @param {string} url   - Full Figma API URL.
 * @param {string} token - Figma personal access token.
 * @returns {Promise<{ status: number, headers: object, data: object }>}
 */
async function figmaApiGet(url, token) {
  let attempt = 0;

  while (true) {
    const response = await new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'X-Figma-Token': token,
            'User-Agent': 'playwright-figma-vrt/1.0',
          },
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            let data;
            try { data = JSON.parse(body); } catch { data = body; }
            resolve({ status: res.statusCode, headers: res.headers, data });
          });
        }
      );
      req.on('error', reject);
      req.end();
    });

    if (response.status === 200) return response;

    const shouldRetry =
      (response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES;

    if (shouldRetry) {
      attempt++;
      const retryAfterHeader = parseInt(response.headers['retry-after'] || '0', 10);
      // Figma sends Retry-After as a Unix timestamp (absolute), not relative seconds.
      // Detect by checking if the value looks like a Unix timestamp (> 1 day in seconds).
      let backoffMs;
      if (retryAfterHeader > 86400) {
        // Absolute Unix timestamp — compute relative wait, cap at 60s
        const relativeMs = (retryAfterHeader * 1000) - Date.now();
        backoffMs = Math.min(Math.max(relativeMs, 1000), 60000);
      } else if (retryAfterHeader > 0) {
        // Standard relative seconds
        backoffMs = Math.min(retryAfterHeader * 1000, 60000);
      } else {
        // No header — exponential backoff: 2s, 4s, 8s, 16s (cap 30s)
        backoffMs = Math.min(1000 * 2 ** attempt, 30000);
      }
      console.warn(
        `[figma] HTTP ${response.status} — retrying in ${(backoffMs / 1000).toFixed(1)}s ` +
        `(attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(backoffMs);
      continue;
    }

    return response;
  }
}

/**
 * Fetch multiple Figma frames/components as PNG Buffers in a single API call.
 *
 * Batches node IDs into groups of BATCH_SIZE (one API call per batch) then
 * downloads all resulting S3 URLs in parallel.  This is the primary function
 * used by figma-pull.js — it reduces a 50-entry config from 50 API calls to 1.
 *
 * @param {string}   fileKey  - Figma file key.
 * @param {string[]} nodeIds  - Array of frame/component node IDs.
 * @param {object}   [opts]
 * @param {string}   opts.token     - Figma PAT (falls back to FIGMA_ACCESS_TOKEN).
 * @param {number}   [opts.scale=1] - Export scale.
 * @returns {Promise<Map<string, Buffer>>}
 *   Map from normalised node ID ("123:456") to PNG Buffer.
 */
async function fetchFigmaImages(fileKey, nodeIds, opts = {}) {
  const token = opts.token || process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'Figma access token is required. ' +
      'Set FIGMA_ACCESS_TOKEN in .env or pass opts.token.'
    );
  }

  const scale = opts.scale || 1;
  const normalized = nodeIds.map(normalizeNodeId);
  const imageUrlMap = new Map(); // normalizedId → signed S3 url

  // One API call per batch — e.g. 50 entries = 1 call instead of 50
  for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
    const batch = normalized.slice(i, i + BATCH_SIZE);
    const ids = batch.map(encodeURIComponent).join(',');
    const apiUrl =
      `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=png&scale=${scale}`;

    const response = await figmaApiGet(apiUrl, token);

    if (response.status === 403) {
      throw new Error(
        'Figma API returned 403 Forbidden. ' +
        'Check that FIGMA_ACCESS_TOKEN is valid and has read access to the file.'
      );
    }
    if (response.status !== 200) {
      throw new Error(
        `Figma API returned HTTP ${response.status}: ` +
        JSON.stringify(response.data)
      );
    }
    if (!response.data.images) {
      throw new Error(
        `Figma API response missing "images" field: ${JSON.stringify(response.data)}`
      );
    }

    for (const id of batch) {
      if (response.data.images[id]) imageUrlMap.set(id, response.data.images[id]);
    }
  }

  // Download all S3 URLs in parallel (S3 is not rate-limited by Figma)
  const results = new Map();
  await Promise.all(
    [...imageUrlMap.entries()].map(async ([id, url]) => {
      results.set(id, await downloadBuffer(url));
    })
  );
  return results;
}

/**
 * Fetch a single Figma frame/component as a PNG Buffer.
 * Convenience wrapper around fetchFigmaImages for single-node use.
 *
 * @param {string} fileKey - Figma file key.
 * @param {string} nodeId  - Node ID ("123-456" or "123:456").
 * @param {object} [opts]
 * @returns {Promise<Buffer>}
 */
async function fetchFigmaImage(fileKey, nodeId, opts = {}) {
  const results = await fetchFigmaImages(fileKey, [nodeId], opts);
  const buffer = results.get(normalizeNodeId(nodeId));
  if (!buffer) {
    throw new Error(
      `Node "${nodeId}" not found in Figma API response for file "${fileKey}".`
    );
  }
  return buffer;
}

/**
 * Parse a Figma copy-link URL or plain object into { fileKey, nodeId }.
 *
 * Accepted forms:
 *   - URL string:  "https://www.figma.com/design/FILEKEY/Name?node-id=123-456"
 *   - Plain object: { nodeId: '123-456', fileKey: 'FILEKEY' }  (fileKey optional)
 *
 * The caller is responsible for applying the fileKey fallback chain when fileKey
 * is null:  (1) parsed from URL  (2) figma.fileKey  (3) config.figma.fileKey
 * (4) FIGMA_FILE_KEY env var.
 *
 * @param {string|{nodeId: string, fileKey?: string, scale?: number}} figmaRef
 * @returns {{ fileKey: string|null, nodeId: string, scale: number }}
 */
function parseFigmaUrl(figmaRef) {
  if (typeof figmaRef === 'string') {
    // Accept both full https URL and bare path like "figma.com/design/KEY/..."
    const normalised = figmaRef.startsWith('http') ? figmaRef : `https://${figmaRef}`;
    let url;
    try {
      url = new URL(normalised);
    } catch {
      throw new Error(`[figma] Cannot parse figma reference as URL: "${figmaRef}"`);
    }

    // Path: /design/{fileKey}/{title}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const designIdx = pathParts.indexOf('design');
    if (designIdx === -1 || !pathParts[designIdx + 1]) {
      throw new Error(
        `[figma] URL does not look like a Figma design link (expected /design/{fileKey}/…): "${figmaRef}"`
      );
    }
    const fileKey = pathParts[designIdx + 1];

    // node-id query param: "123-456" → normalise to "123:456"
    const rawNodeId = url.searchParams.get('node-id');
    if (!rawNodeId) {
      throw new Error(
        `[figma] Figma URL is missing a "node-id" query parameter: "${figmaRef}"\n` +
        '  Right-click the frame in Figma → Copy link → the URL includes ?node-id=…'
      );
    }
    return { fileKey, nodeId: normalizeNodeId(rawNodeId), scale: 1 };
  }

  if (figmaRef && typeof figmaRef === 'object') {
    if (!figmaRef.nodeId) {
      throw new Error('[figma] figma object must have a "nodeId" property.');
    }
    return {
      fileKey: figmaRef.fileKey || null,
      nodeId: normalizeNodeId(figmaRef.nodeId),
      scale: figmaRef.scale || 1,
    };
  }

  throw new Error(
    '[figma] figma field must be a Figma copy-link URL string or an object with nodeId.'
  );
}

module.exports = { fetchFigmaImage, fetchFigmaImages, normalizeNodeId, parseFigmaUrl };
