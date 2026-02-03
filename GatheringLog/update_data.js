const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Configuration ---
const BASE_URL = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json';
const RAW_DATA_DIR = path.join(__dirname, 'temp_raw_data');
const TW_DIR = path.join(RAW_DATA_DIR, 'tw');
const APP_DATA_DIR = path.join(__dirname, 'data');

// Ensure directories exist
if (!fs.existsSync(RAW_DATA_DIR)) fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
if (!fs.existsSync(TW_DIR)) fs.mkdirSync(TW_DIR, { recursive: true });
if (!fs.existsSync(APP_DATA_DIR)) fs.mkdirSync(APP_DATA_DIR, { recursive: true });

// --- Helper Functions ---

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading: ${url}`);
        const file = fs.createWriteStream(dest);
        
        const request = https.get(url, { timeout: 10000 }, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
                        console.log(`Saved to: ${path.basename(dest)}`);
                        resolve();
                    });
                });
            } else {
                file.close();
                fs.unlink(dest, () => {}); // Delete empty file
                console.warn(`Failed: ${url} (Status: ${response.statusCode})`);
                resolve(); // Resolve to allow script to continue
            }
        });

        request.on('error', (err) => {
            file.close();
            fs.unlink(dest, () => {});
            console.error(`Error downloading ${url}: ${err.message}`);
            resolve();
        });

        request.on('timeout', () => {
            request.destroy();
            file.close();
            fs.unlink(dest, () => {});
            console.error(`Timeout downloading ${url}`);
            resolve();
        });
    });
}

function loadJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) return {};
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
        return {};
    }
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Saved data to: ${path.basename(filePath)}`);
}

// --- Main Workflow Steps ---

async function step1_downloadData() {
    console.log('\n--- Step 1: Downloading Data ---');
    
    // Ensure Clean Start
    if (fs.existsSync(RAW_DATA_DIR)) fs.rmSync(RAW_DATA_DIR, { recursive: true, force: true });
    fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
    fs.mkdirSync(TW_DIR, { recursive: true });

    const FILES_TO_DOWNLOAD = [
        { url: `${BASE_URL}/items.json`, dest: path.join(RAW_DATA_DIR, 'items.json') },
        { url: `${BASE_URL}/gathering-items.json`, dest: path.join(RAW_DATA_DIR, 'gathering-items.json') },
        { url: `${BASE_URL}/nodes.json`, dest: path.join(RAW_DATA_DIR, 'nodes.json') },
        { url: `${BASE_URL}/places.json`, dest: path.join(RAW_DATA_DIR, 'places.json') },
        { url: `${BASE_URL}/maps.json`, dest: path.join(RAW_DATA_DIR, 'maps.json') }, // Added maps.json
        // TW files
        { url: `${BASE_URL}/tw/tw-items.json`, dest: path.join(TW_DIR, 'items.json') },
        { url: `${BASE_URL}/tw/tw-places.json`, dest: path.join(TW_DIR, 'places.json') },
        { url: `${BASE_URL}/tw/tw-gathering-items.json`, dest: path.join(TW_DIR, 'gathering-items.json') },
        // App specific
        { url: `${BASE_URL}/gathering-log-pages.json`, dest: path.join(RAW_DATA_DIR, 'gathering-log-pages.json') },
        { url: `${BASE_URL}/item-icons.json`, dest: path.join(RAW_DATA_DIR, 'item-icons.json') },
    ];

    for (const fileInfo of FILES_TO_DOWNLOAD) {
        await downloadFile(fileInfo.url, fileInfo.dest);
    }
}

async function step2_mergeData() {
    console.log('\n--- Step 2: Merging Locale Data ---');

    function merge(baseFile, twFile, outputFile, keyName = 'tw') {
        if (!fs.existsSync(baseFile)) {
             console.warn(`Base file not found: ${baseFile}, skipping merge.`);
             return;
        }
        
        const baseData = loadJson(baseFile);
        const twData = fs.existsSync(twFile) ? loadJson(twFile) : {}; 
        
        let mergedCount = 0;

        for (const id in baseData) {
            if (twData[id] && twData[id].tw) {
                baseData[id][keyName] = twData[id].tw;
                mergedCount++;
            }
        }
        
         for (const id in twData) {
            if (!baseData[id]) {
                 baseData[id] = { [keyName]: twData[id].tw };
            }
        }

        console.log(`Merged ${path.basename(baseFile)}: Updated ${mergedCount} entries.`);
        saveJson(outputFile, baseData);
    }

    // Merge Items
    merge(
        path.join(RAW_DATA_DIR, 'items.json'),
        path.join(TW_DIR, 'items.json'),
        path.join(APP_DATA_DIR, 'items.json')
    );

    // Merge Places
    merge(
        path.join(RAW_DATA_DIR, 'places.json'),
        path.join(TW_DIR, 'places.json'),
        path.join(APP_DATA_DIR, 'places.json')
    );

    // Copy exact files
    const filesToCopy = ['nodes.json', 'gathering-items.json', 'gathering-log-pages.json', 'item-icons.json', 'maps.json'];
    filesToCopy.forEach(file => {
        const src = path.join(RAW_DATA_DIR, file);
        const dest = path.join(APP_DATA_DIR, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`Copied ${file}`);
        }
    });
}

async function step3_filterData() {
    console.log('\n--- Step 3: Filtering & Optimizing Data ---');
    
    const ITEMS_PATH = path.join(APP_DATA_DIR, 'items.json');
    const LOG_PAGES_PATH = path.join(APP_DATA_DIR, 'gathering-log-pages.json');
    const ICONS_SOURCE_PATH = path.join(APP_DATA_DIR, 'item-icons.json');
    const ICONS_OUTPUT_PATH = path.join(APP_DATA_DIR, 'icons.json'); 

    if (!fs.existsSync(ITEMS_PATH) || !fs.existsSync(LOG_PAGES_PATH) || !fs.existsSync(ICONS_SOURCE_PATH)) {
        console.error('Missing necessary files for filtering.');
        return;
    }

    const items = loadJson(ITEMS_PATH);
    const logPages = loadJson(LOG_PAGES_PATH);
    const rawIcons = loadJson(ICONS_SOURCE_PATH);

    // Find all Item IDs used in the Gathering Log (and Folklore)
    const allowedItemIds = new Set();
    
    // 1. From Log Pages
    function extractItemIds(obj) {
        if (Array.isArray(obj)) {
            obj.forEach(item => extractItemIds(item));
        } else if (typeof obj === 'object' && obj !== null) {
            if (obj.itemId) {
                allowedItemIds.add(String(obj.itemId));
            }
            Object.values(obj).forEach(val => extractItemIds(val));
        }
    }
    extractItemIds(logPages);

    // 2. From Nodes (Folklore Books)
    const NODES_PATH = path.join(APP_DATA_DIR, 'nodes.json');
    if (fs.existsSync(NODES_PATH)) {
        const nodes = loadJson(NODES_PATH);
        for (const nodeId in nodes) {
            const node = nodes[nodeId];
            if (node.folklore) {
                allowedItemIds.add(String(node.folklore));
            }
        }
    }

    console.log(`Found ${allowedItemIds.size} unique items in Log & Folklore.`);

    // Filter Items
    const filteredItems = {};
    let keptCount = 0;
    for (const itemId in items) {
        if (allowedItemIds.has(itemId)) {
            filteredItems[itemId] = items[itemId];
            keptCount++;
        }
    }
    saveJson(ITEMS_PATH, filteredItems); 

    // Filter Icons
    const filteredIcons = {};
    let iconCount = 0;
    for (const itemId in rawIcons) {
        if (allowedItemIds.has(itemId)) {
            filteredIcons[itemId] = rawIcons[itemId];
            iconCount++;
        }
    }
    saveJson(ICONS_OUTPUT_PATH, filteredIcons);
    
    // Cleanup large source icon file
    fs.unlinkSync(ICONS_SOURCE_PATH);
    console.log(`Cleaned up temporary file: item-icons.json`);

    console.log(`\nFiltered Items kept: ${keptCount}`);
    console.log(`Filtered Icons kept: ${iconCount}`);
}

async function cleanup() {
    console.log('\n--- Cleanup ---');
    if (fs.existsSync(RAW_DATA_DIR)) {
        fs.rmSync(RAW_DATA_DIR, { recursive: true, force: true });
        console.log(`Deleted temporary directory: ${RAW_DATA_DIR}`);
    }
}

async function main() {
    try {
        await step1_downloadData();
        await step2_mergeData();
        await step3_filterData();
        await cleanup();
        console.log('\n=== Update Complete ===');
    } catch (err) {
        console.error('\n!!! Update Failed !!!');
        console.error(err);
        try { await cleanup(); } catch (e) {}
    }
}

main();
