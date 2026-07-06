/**
 * optimize_data.cjs
 * Post-processing pass that shrinks the gathering-log data files:
 *   1. Strips de/fr locale fields from items.json / places.json
 *      (the UI only supports tw/zh/en/ja).
 *   2. Compresses icons.json values from full XIVAPI v2 asset paths
 *      ("/api/asset?path=ui/icon/021000/021209_hr1.tex&format=png")
 *      down to the bare icon number (21209). getItemIconUrl() rebuilds
 *      the full URL at runtime. Values that do not match the known v2
 *      pattern are kept verbatim as a fallback; empty values are dropped
 *      (both '' and a missing key resolve to the default item icon).
 *
 * Idempotent: safe to run on already-optimized files.
 * Run standalone: node scripts/optimize_data.cjs
 * Also invoked at the end of update_data.cjs step 3.
 */
const fs = require('fs');
const path = require('path');

const APP_DATA_DIR = path.join(__dirname, '../public/data/gathering-log');
const V2_ICON_RE = /^\/api\/asset\?path=ui\/icon\/(\d{6})\/(\d{6})_hr1\.tex&format=png$/;

function fileSizeMb(filePath) {
    return (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
}

function trimLocales(fileName) {
    const filePath = path.join(APP_DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`Skip locale trim: missing ${fileName}`);
        return;
    }

    const before = fileSizeMb(filePath);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let removed = 0;

    for (const entry of Object.values(data)) {
        if (!entry || typeof entry !== 'object') continue;
        if ('de' in entry) { delete entry.de; removed++; }
        if ('fr' in entry) { delete entry.fr; removed++; }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Trimmed de/fr from ${fileName}: ${removed} fields removed (${before}MB -> ${fileSizeMb(filePath)}MB)`);
}

function compressIcons() {
    const filePath = path.join(APP_DATA_DIR, 'icons.json');
    if (!fs.existsSync(filePath)) {
        console.warn('Skip icon compression: missing icons.json');
        return;
    }

    const before = fileSizeMb(filePath);
    const icons = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const output = {};
    let compressed = 0, dropped = 0, kept = 0, passthrough = 0;

    for (const [itemId, value] of Object.entries(icons)) {
        if (typeof value === 'number') {
            output[itemId] = value; // already optimized
            passthrough++;
            continue;
        }
        if (!value) { dropped++; continue; } // '' -> default icon at runtime

        const match = typeof value === 'string' && value.match(V2_ICON_RE);
        const iconNumber = match ? parseInt(match[2], 10) : NaN;
        const expectedFolder = String(Math.floor(iconNumber / 1000) * 1000).padStart(6, '0');

        if (match && match[1] === expectedFolder) {
            output[itemId] = iconNumber;
            compressed++;
        } else {
            output[itemId] = value; // unknown format: keep verbatim as fallback
            kept++;
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(output), 'utf-8');
    console.log(`Compressed icons.json: ${compressed} compressed, ${dropped} empty dropped, ${kept} kept verbatim, ${passthrough} already numeric (${before}MB -> ${fileSizeMb(filePath)}MB)`);
}

function optimizeData() {
    trimLocales('items.json');
    trimLocales('places.json');
    compressIcons();
}

optimizeData();

module.exports = { optimizeData };
