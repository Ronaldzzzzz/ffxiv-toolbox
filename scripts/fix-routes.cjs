const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const SITE_BASE = 'https://ronaldzzzzz.github.io/ffxiv-toolbox';

// Per-route static <head> overrides. GitHub Pages serves these copies for
// direct visits, so crawlers must see route-specific title/canonical/OG tags
// instead of the homepage ones (otherwise the route looks like a duplicate
// of the homepage and is not indexed separately).
const routes = [
  {
    dir: 'gathering-log',
    title: 'FF14 採集手冊 - 限時採集鬧鐘與進度追蹤 | FFXIV Toolbox',
    description:
      'FF14/FFXIV 採集手冊(Gathering Log)線上工具。追蹤採礦工、園藝工圖鑑進度，限時採集點鬧鐘通知、遊戲內巨集產生、書籤群組與地圖採集點查詢。支援繁中、簡中、英文、日文。',
    canonical: `${SITE_BASE}/gathering-log/`,
    ogImage: `${SITE_BASE}/og-image-gathering.png`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'FF14 採集手冊 (FFXIV Gathering Log Tracker)',
      url: `${SITE_BASE}/gathering-log/`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      inLanguage: ['zh-TW', 'zh-CN', 'en', 'ja'],
      isAccessibleForFree: true,
      description:
        'Track FFXIV gathering log progress for Miner and Botanist, with timed node alarms, in-game macro generation, bookmark groups, and map node locations.',
      featureList: [
        '限時採集點鬧鐘 (Timed node alarms)',
        '採集圖鑑進度追蹤 (Gathering log progress tracking)',
        '遊戲內巨集產生 (In-game alarm macro generation)',
        '地圖採集點查詢 (Map node locations)',
        '書籤群組管理 (Bookmark groups)',
      ],
    },
  },
];

function rewriteHead(html, route) {
  let out = html;

  const replaceOrWarn = (pattern, replacement, label) => {
    if (pattern.test(out)) {
      out = out.replace(pattern, replacement);
    } else {
      console.warn(`  [warn] ${route.dir}: could not find ${label} tag to rewrite`);
    }
  };

  replaceOrWarn(/<title>[\s\S]*?<\/title>/, `<title>${route.title}</title>`, 'title');
  replaceOrWarn(
    /<meta name="description" content="[\s\S]*?" \/>/,
    `<meta name="description" content="${route.description}" />`,
    'description'
  );
  replaceOrWarn(
    /<link rel="canonical" href="[\s\S]*?" \/>/,
    `<link rel="canonical" href="${route.canonical}" />`,
    'canonical'
  );
  replaceOrWarn(
    /<meta property="og:url" content="[\s\S]*?" \/>/,
    `<meta property="og:url" content="${route.canonical}" />`,
    'og:url'
  );
  replaceOrWarn(
    /<meta property="og:title" content="[\s\S]*?" \/>/,
    `<meta property="og:title" content="${route.title}" />`,
    'og:title'
  );
  replaceOrWarn(
    /<meta property="og:description" content="[\s\S]*?" \/>/,
    `<meta property="og:description" content="${route.description}" />`,
    'og:description'
  );
  replaceOrWarn(
    /<meta property="og:image" content="[\s\S]*?" \/>/,
    `<meta property="og:image" content="${route.ogImage}" />`,
    'og:image'
  );
  replaceOrWarn(
    /<meta name="twitter:title" content="[\s\S]*?" \/>/,
    `<meta name="twitter:title" content="${route.title}" />`,
    'twitter:title'
  );
  replaceOrWarn(
    /<meta name="twitter:description" content="[\s\S]*?" \/>/,
    `<meta name="twitter:description" content="${route.description}" />`,
    'twitter:description'
  );
  replaceOrWarn(
    /<meta name="twitter:image" content="[\s\S]*?" \/>/,
    `<meta name="twitter:image" content="${route.ogImage}" />`,
    'twitter:image'
  );

  if (route.jsonLd) {
    const script = `<script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>\n  </head>`;
    out = out.replace('</head>', script);
  }

  return out;
}

console.log('Starting post-build route fix...');

routes.forEach(route => {
  const routeDir = path.join(distDir, route.dir);

  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
    console.log(`Created directory: ${routeDir}`);
  }

  const sourceFile = path.join(distDir, 'index.html');
  const targetFile = path.join(routeDir, 'index.html');

  if (fs.existsSync(sourceFile)) {
    const html = fs.readFileSync(sourceFile, 'utf-8');
    fs.writeFileSync(targetFile, rewriteHead(html, route), 'utf-8');
    console.log(`Wrote route-specific index.html to ${targetFile}`);
  } else {
    console.error(`Error: Source index.html not found at ${sourceFile}`);
  }
});

console.log('Route fix completed!');
