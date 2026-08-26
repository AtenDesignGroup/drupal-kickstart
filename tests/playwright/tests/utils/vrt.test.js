const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MAX_SCREENSHOT_HEIGHT,
  applyClipIfNeeded,
} = require('./vrt');

test('leaves non-full-page options unchanged without measuring the page', async () => {
  const options = { fullPage: false, animations: 'disabled' };
  const page = {
    evaluate: () => {
      throw new Error('Page dimensions should not be read.');
    },
  };

  const result = await applyClipIfNeeded(page, options);

  assert.strictEqual(result, options);
});

test('leaves full-page options unchanged when the page fits the limit', async () => {
  const options = { fullPage: true, animations: 'disabled' };
  const page = {
    evaluate: async () => ({ width: 1440, height: MAX_SCREENSHOT_HEIGHT }),
  };

  const result = await applyClipIfNeeded(page, options);

  assert.strictEqual(result, options);
});

test('clips an oversized full-page screenshot to the configured limit', async () => {
  const options = { fullPage: true, animations: 'disabled' };
  const page = {
    evaluate: async () => ({
      width: 1440,
      height: MAX_SCREENSHOT_HEIGHT + 1,
    }),
  };

  const result = await applyClipIfNeeded(page, options);

  assert.deepEqual(result, {
    fullPage: false,
    animations: 'disabled',
    clip: {
      x: 0,
      y: 0,
      width: 1440,
      height: MAX_SCREENSHOT_HEIGHT,
    },
  });
  assert.notStrictEqual(result, options);
});
