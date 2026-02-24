module.exports = [
  {
    "name": "admin-content",
    "url": "/admin/content",
    "projects": ["chrome-desktop"],
    "drupalAuth": { "uid": 1 },
    "screenshotOptions": { "maxDiffPixelRatio": 0.05 },
    "screenshots": [
      { "selector": ".view-filters", "name": "filters" },
      { "selector": ".view-content.gin-layer-wrapper", "name": "content" }
    ]
  },
  {
    "name": "homepage",
    "url": "/",
    "screenshots": [
      { "selector": ".card--webinar.card--large", "name": "webinar" },
      { "selector": ".case-study-teaser--large", "name": "case-study" }
    ]
  },
  {
    "name": "work",
    "url": "/work"
  },
  {
    "name": "services",
    "url": "/services"
  },
  {
    "name": "about",
    "url": "/about"
  },
  {
    "name": "blog",
    "url": "/blog"
  },
  {
    "name": "contact",
    "url": "/contact"
  }
];
