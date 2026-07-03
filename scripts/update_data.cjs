const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Configuration ---
const BASE_URL = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json';
const RAW_DATA_DIR = path.join(__dirname, 'temp_raw_data');
// Output to public/data/gathering-log so the app can read it
const APP_DATA_DIR = path.join(__dirname, '../public/data/gathering-log');

const LOCALES = [
    { code: 'tw', remoteDir: 'tw', prefix: 'tw-' }, // Key in source might be 'tw' or just matching ID
    { code: 'zh', remoteDir: 'zh', prefix: 'zh-' }
];

// Ensure directories exist
if (!fs.existsSync(RAW_DATA_DIR)) fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
if (!fs.existsSync(APP_DATA_DIR)) fs.mkdirSync(APP_DATA_DIR, { recursive: true });
LOCALES.forEach(loc => {
    const locDir = path.join(RAW_DATA_DIR, loc.code);
    if (!fs.existsSync(locDir)) fs.mkdirSync(locDir, { recursive: true });
});

// ... (Helper Functions remain the same) ...

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
    LOCALES.forEach(loc => {
        fs.mkdirSync(path.join(RAW_DATA_DIR, loc.code), { recursive: true });
    });

    const FILES_TO_DOWNLOAD = [
        { url: `${BASE_URL}/items.json`, dest: path.join(RAW_DATA_DIR, 'items.json') },
        { url: `${BASE_URL}/nodes.json`, dest: path.join(RAW_DATA_DIR, 'nodes.json') },
        { url: `${BASE_URL}/places.json`, dest: path.join(RAW_DATA_DIR, 'places.json') },
        { url: `${BASE_URL}/maps.json`, dest: path.join(RAW_DATA_DIR, 'maps.json') },
        { url: `${BASE_URL}/aetherytes.json`, dest: path.join(RAW_DATA_DIR, 'aetherytes.json') },
        // App specific
        { url: `${BASE_URL}/gathering-log-pages.json`, dest: path.join(RAW_DATA_DIR, 'gathering-log-pages.json') },
        { url: `${BASE_URL}/item-icons.json`, dest: path.join(RAW_DATA_DIR, 'item-icons.json') },
        { url: `${BASE_URL}/recipes-per-item.json`, dest: path.join(RAW_DATA_DIR, 'recipes-per-item.json') },
        { url: `${BASE_URL}/satisfaction-thresholds.json`, dest: path.join(RAW_DATA_DIR, 'satisfaction-thresholds.json') },
    ];

    // Add Locale Files
    LOCALES.forEach(loc => {
        const locDir = path.join(RAW_DATA_DIR, loc.code);
        FILES_TO_DOWNLOAD.push({ 
            url: `${BASE_URL}/${loc.remoteDir}/${loc.prefix}items.json`, 
            dest: path.join(locDir, 'items.json') 
        });
        FILES_TO_DOWNLOAD.push({ 
            url: `${BASE_URL}/${loc.remoteDir}/${loc.prefix}places.json`, 
            dest: path.join(locDir, 'places.json') 
        });
        // Note: gathering-items skipped for locales as per previous manual edit
    });

    for (const fileInfo of FILES_TO_DOWNLOAD) {
        await downloadFile(fileInfo.url, fileInfo.dest);
    }
}

async function step2_mergeData() {
    console.log('\n--- Step 2: Merging Locale Data ---');

    // Generic merge function
    function merge(baseFile, localeFile, outputFile, keyName) {
        if (!fs.existsSync(baseFile)) {
             console.warn(`Base file not found: ${baseFile}, skipping merge.`);
             return;
        }
        
        const baseData = loadJson(baseFile);
        const locData = fs.existsSync(localeFile) ? loadJson(localeFile) : {}; 
        
        let mergedCount = 0;

        // Teamcraft locale files usually have structure { id: { en:..., ja:..., [keyName]:... } } 
        // OR sometimes { id: { ... } } where keys are directly properties.
        // But specifically for 'tw'/'zh' folder files from Teamcraft, they are often partials.
        // Let's assume standard structure or the specific structure for TW/ZH.
        // Based on previous code: `twData[id].tw` implies the structure is `{ id: { tw: "String" } }` or `{ id: { ..., tw: "..." } }`

        for (const id in baseData) {
            // Check if locale data exists for this ID
            if (locData[id]) {
                const val = locData[id][keyName]; // e.g. locData[123]['zh']
                if (val) {
                    baseData[id][keyName] = val;
                    mergedCount++;
                }
            }
        }
        
        // Also add entries that might exist in locale file but not in base (though rare for Items/Places usually)
         for (const id in locData) {
            if (!baseData[id] && locData[id][keyName]) {
                 baseData[id] = { [keyName]: locData[id][keyName] };
            }
        }

        console.log(`Merged ${keyName} into ${path.basename(baseFile)}: Updated ${mergedCount} entries.`);
        saveJson(outputFile, baseData);
    }

    // Process each locale
    LOCALES.forEach(loc => {
        console.log(`\nProcessing locale: ${loc.code}`);
        const locDir = path.join(RAW_DATA_DIR, loc.code);

        // Merge Items
        merge(
            path.join(APP_DATA_DIR, 'items.json'), // Merge ON TOP of existing (accumulate changes)
            path.join(locDir, 'items.json'),
            path.join(APP_DATA_DIR, 'items.json'), // Output back to same file
            loc.code // key name e.g. 'zh'
        );

        // Merge Places
        merge(
            path.join(APP_DATA_DIR, 'places.json'),
            path.join(locDir, 'places.json'),
            path.join(APP_DATA_DIR, 'places.json'),
            loc.code
        );
    });

    // Copy exact files (Base files first to initialize APP_DATA_DIR for partial merges above?)
    // Wait, the partial merge above reads from APP_DATA_DIR, but if it's the first run, APP_DATA_DIR might be empty or have old data.
    // Correct order: 
    // 1. Copy fresh Base files (English/Japanese/etc from main) to APP_DATA_DIR.
    // 2. Loop locales and merge INTO APP_DATA_DIR files.

    console.log('\nInitializing base files...');
    const filesToCopy = ['items.json', 'places.json', 'nodes.json', 'gathering-log-pages.json', 'item-icons.json', 'maps.json', 'aetherytes.json', 'recipes-per-item.json', 'satisfaction-thresholds.json'];
    
    // We copy items.json and places.json FIRST to ensure they exist for merging
    ['items.json', 'places.json'].forEach(file => {
        const src = path.join(RAW_DATA_DIR, file);
        const dest = path.join(APP_DATA_DIR, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
        }
    });

    // NOW merge locales
    LOCALES.forEach(loc => {
        console.log(`Processing locale: ${loc.code}`);
        const locDir = path.join(RAW_DATA_DIR, loc.code);

        merge(
            path.join(APP_DATA_DIR, 'items.json'), 
            path.join(locDir, 'items.json'),
            path.join(APP_DATA_DIR, 'items.json'), 
            loc.code
        );

        merge(
            path.join(APP_DATA_DIR, 'places.json'),
            path.join(locDir, 'places.json'),
            path.join(APP_DATA_DIR, 'places.json'),
            loc.code
        );
    });

    // Copy remaining static files
    filesToCopy.forEach(file => {
        if (file === 'items.json' || file === 'places.json') return; // Already handled
        const src = path.join(RAW_DATA_DIR, file);
        const dest = path.join(APP_DATA_DIR, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`Copied ${file}`);
        }
    });
}

async function step3_filterData() {
    console.log('\n--- Step 3: Filtering & Optimizing Data (Modded to Keep All Items) ---');
    
    const ITEMS_PATH = path.join(APP_DATA_DIR, 'items.json');
    const LOG_PAGES_PATH = path.join(APP_DATA_DIR, 'gathering-log-pages.json');
    const ICONS_SOURCE_PATH = path.join(APP_DATA_DIR, 'item-icons.json');
    const ICONS_OUTPUT_PATH = path.join(APP_DATA_DIR, 'icons.json'); 
    const METADATA_PATH = path.join(APP_DATA_DIR, 'metadata.json');

    console.log('Checking files at:', APP_DATA_DIR);
    if (!fs.existsSync(ITEMS_PATH)) console.error('Missing items.json');
    if (!fs.existsSync(ICONS_SOURCE_PATH)) console.error('Missing item-icons.json');

    if (!fs.existsSync(ITEMS_PATH) || !fs.existsSync(ICONS_SOURCE_PATH)) {
        console.error('Missing necessary files for processing.');
        return;
    }

    // Since we need ALL items for Allied Society tools, we bypass the aggressive filtering 
    // that was meant only for gathering log. We just rename the icons file to match the expected output.
    fs.copyFileSync(ICONS_SOURCE_PATH, ICONS_OUTPUT_PATH);
    
    // Cleanup large source icon file
    if (fs.existsSync(ICONS_SOURCE_PATH)) {
        fs.unlinkSync(ICONS_SOURCE_PATH);
        console.log(`Cleaned up temporary file: item-icons.json (Moved to icons.json)`);
    }

    console.log(`\nFiltered Items kept: ALL (Filter bypass applied)`);
    console.log(`Filtered Icons kept: ALL (Filter bypass applied)`);

    // Generate Metadata
    // TEAMCRAFT_SHA may be injected by CI (GitHub Actions) via environment variable.
    // When running locally it will be empty string, which is fine —
    // the workflow step overwrites teamcraftSha after this script finishes.
    const existingMeta = fs.existsSync(METADATA_PATH) ? loadJson(METADATA_PATH) : {};
    const metadata = {
        lastUpdated: new Date().toISOString(),
        teamcraftSha: process.env.TEAMCRAFT_SHA || existingMeta.teamcraftSha || ''
    };
    saveJson(METADATA_PATH, metadata);
    console.log(`Generated metadata.json with timestamp: ${metadata.lastUpdated}`);

    // Derive recipe-item-ids.json (small isRecipe index; the full recipes file
    // is only fetched lazily by the app when a recipe modal is opened)
    require('./derive_recipe_ids.cjs');
}

function getItemDisplayName(itemData = {}) {
    return itemData.tw || itemData.zh || itemData.en || itemData.ja || '(unknown)';
}

async function step4_listGatherableCustomDeliveryItems() {
    console.log('\n--- Step 4: Listing Gatherable Custom Delivery Collectibles ---');

    const ITEMS_PATH = path.join(APP_DATA_DIR, 'items.json');
    const NODES_PATH = path.join(APP_DATA_DIR, 'nodes.json');
    const LOG_PAGES_PATH = path.join(APP_DATA_DIR, 'gathering-log-pages.json');
    const SATISFACTION_PATH = path.join(APP_DATA_DIR, 'satisfaction-thresholds.json');

    if (!fs.existsSync(ITEMS_PATH) || !fs.existsSync(NODES_PATH) || !fs.existsSync(SATISFACTION_PATH)) {
        console.warn('Skip listing: missing one of items.json / nodes.json / satisfaction-thresholds.json');
        return;
    }

    const items = loadJson(ITEMS_PATH);
    const nodes = loadJson(NODES_PATH);
    const satisfactionThresholds = loadJson(SATISFACTION_PATH);
    const logPages = fs.existsSync(LOG_PAGES_PATH) ? loadJson(LOG_PAGES_PATH) : [];

    const nodeItemIds = new Set();
    for (const node of Object.values(nodes)) {
        const candidateIds = [...(node.items || []), ...(node.hiddenItems || [])];
        candidateIds.forEach(id => nodeItemIds.add(String(id)));
    }

    const handbookItemIds = new Set();
    for (const jobPages of logPages) {
        for (const page of jobPages) {
            for (const entry of (page.items || [])) {
                handbookItemIds.add(String(entry.itemId));
            }
        }
    }

    const gatherableCustomDeliveryIds = Object.keys(satisfactionThresholds)
        .filter(id => nodeItemIds.has(String(id)))
        .sort((a, b) => Number(a) - Number(b));

    const rows = gatherableCustomDeliveryIds.map(id => {
        const itemData = items[id] || {};
        return {
            id,
            name: getItemDisplayName(itemData),
            isInHandbook: handbookItemIds.has(id)
        };
    }).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));

    console.log(`Found ${rows.length} gatherable custom delivery collectible items.`);
    console.log('Format: [itemId] 名稱 (handbook: Y/N)');
    rows.forEach(row => {
        console.log(`[${row.id}] ${row.name} (handbook: ${row.isInHandbook ? 'Y' : 'N'})`);
    });
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
        await step4_listGatherableCustomDeliveryItems();
        await cleanup();
        console.log('\n=== Update Complete ===');
    } catch (err) {
        console.error('\n!!! Update Failed !!!');
        console.error(err);
        try { await cleanup(); } catch (e) {}
    }
}

main();
