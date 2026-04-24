const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const routes = ['gathering-log'];

console.log('Starting post-build route fix...');

routes.forEach(route => {
  const routeDir = path.join(distDir, route);
  
  // 建立資料夾
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
    console.log(`Created directory: ${routeDir}`);
  }

  // 複製 index.html
  const sourceFile = path.join(distDir, 'index.html');
  const targetFile = path.join(routeDir, 'index.html');

  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`Copied index.html to ${targetFile}`);
  } else {
    console.error(`Error: Source index.html not found at ${sourceFile}`);
  }
});

console.log('Route fix completed!');
