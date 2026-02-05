// --- Theme Logic ---
function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('ffxiv-tools-theme', 'light');
        document.getElementById('theme-toggle').innerText = '🌙';
    } else {
        html.classList.add('dark');
        localStorage.setItem('ffxiv-tools-theme', 'dark');
        document.getElementById('theme-toggle').innerText = '☀️';
    }
}

(function () {
    const savedTheme = localStorage.getItem('ffxiv-tools-theme');
    if (savedTheme === 'dark' || !savedTheme) { // Default dark
        document.documentElement.classList.add('dark');
        document.getElementById('theme-toggle').innerText = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-toggle').innerText = '🌙';
    }
})();

// --- Global Variables ---
let completedItems = new Set();
let currentLang = localStorage.getItem('ff14_lang_pref') || 'zh-TW';
let currentJob = 'miner'; // 'miner' or 'botanist'
let currentRegion = 'all'; 

// Data containers
let gLogPages = [];
let gItems = {};
let gIcons = {}; // New container for icons
let gPlaces = {};
let gNodes = {};
let gMaps = {}; // New container for maps
let gItemNodes = {}; // Reverse lookup: ItemID -> [Node Info]
let gUiLocales = {};
let gCollapsedExpansions = new Set(); // Track collapsed specific expansion sections
let gLastAvailableZones = null; // Store for re-rendering sidebar
let gHideCompleted = false;
let gShowBookmarksOnly = false; // New: Filter to show only bookmarked items
let bookmarkedItems = new Set(); // New: Store bookmarked item IDs
let currentGatherType = 'mining'; // Default to first type
let currentViewMode = 'level'; // 'level' for normal view, 'timed' for timed nodes, 'map' for map view
let selectedMapId = null; // Currently selected map for map view

const BOOKMARK_STORAGE_KEY = 'ffxiv_gathering_log_bookmarks';

// Type configuration: maps gather type to page indices in gLogPages
// gLogPages structure: [0]=Mining, [1]=Quarrying, [2]=Harvesting, [3]=Logging
const PAGE_INDEX_CONFIG = {
    miner: {
        all: [0, 1],      // Both Mining and Quarrying
        mining: [0],      // Mining only (node type 1)
        quarrying: [1]    // Quarrying only (node type 0)
    },
    botanist: {
        all: [2, 3],      // Both Harvesting and Logging
        harvesting: [2],  // Harvesting only (node type 2)
        logging: [3]      // Logging only (node type 3)
    }
};

const UI_ICONS = {
    folklore: 'https://xivapi.com/i/026000/026168_hr1.png',
    mining: 'https://xivapi.com/i/062000/062201_hr1.png',
    quarrying: 'https://xivapi.com/i/062000/062202_hr1.png',
    logging: 'https://xivapi.com/i/062000/062203_hr1.png',
    harvesting: 'https://xivapi.com/i/062000/062204_hr1.png'
};

const STORAGE_KEY = 'ffxiv_gathering_log_progress';
const EXPANSION_MAP = {
    // 2.0 ARR
    20: 'exp_2', 21: 'exp_2', 22: 'exp_2', 23: 'exp_2', 24: 'exp_2', 25: 'exp_2', 26: 'exp_2',
    // 3.0 HW
    497: 'exp_3', 498: 'exp_3',
    // 4.0 SB
    2400: 'exp_4', 2401: 'exp_4', 2402: 'exp_4',
    // 5.0 ShB
    2950: 'exp_5',
    // 6.0 EW
    3700: 'exp_6', 3701: 'exp_6', 3702: 'exp_6', 3703: 'exp_6', 3704: 'exp_6', 3705: 'exp_6',
    // 7.0 DT
    4500: 'exp_7', 4501: 'exp_7', 4502: 'exp_7'
};

async function init() {
    try {
        // Load saved progress
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) completedItems = new Set(JSON.parse(saved));

        // Load saved bookmarks
        const savedBookmarks = localStorage.getItem(BOOKMARK_STORAGE_KEY);
        if (savedBookmarks) bookmarkedItems = new Set(JSON.parse(savedBookmarks));

        // Load JSON data in parallel
        // Load JSON data in parallel
        const [pagesRes, itemsRes, iconsRes, placesRes, nodesRes, mapsRes, uiRes] = await Promise.all([
            fetch('data/gathering-log-pages.json'),
            fetch('data/items.json'),
            fetch('data/icons.json'), // Load icons.json
            fetch('data/places.json'),
            fetch('data/nodes.json'),
            fetch('data/maps.json'),
            fetch('data/ui_locales.json')
        ]);

        if (!pagesRes.ok || !itemsRes.ok || !iconsRes.ok) throw new Error("Failed to load data files");

        gLogPages = await pagesRes.json();
        gItems = await itemsRes.json();
        gIcons = await iconsRes.json();
        gPlaces = await placesRes.json();
        gNodes = await nodesRes.json();
        gMaps = await mapsRes.json();
        gUiLocales = await uiRes.json();

        processNodes();
        updateLangButtons();
        render();
        
        // Setup sticky header calculations
        setTimeout(updateStickyOffsets, 100);
        window.addEventListener('resize', updateStickyOffsets);
        window.addEventListener('scroll', updateStickyOffsets);
        
        // Enable drag scroll for grid
        enableDragScroll(document.getElementById('level-grid'));

    } catch (err) {
        console.error(err);
        document.getElementById('list-container').innerHTML = `
            <div class="col-span-full text-red-400 text-center p-4 border border-red-800 rounded bg-red-900/20">
                Error loading data: ${err.message}<br>
                <small>Ensure you are running this via a Web Server (e.g. VS Code Live Server)</small>
            </div>`;
    }
}

// Helper to get region info from map ID
function getRegionInfo(mapId) {
    const map = gMaps[mapId];
    if (!map) return { regionId: 0, placeId: 0 };
    
    return {
        regionId: map.region_id,   // e.g. 24 (Thanalan)
        placeId: map.placename_id  // e.g. 43 (Central Thanalan)
    };
}

function processNodes() {
    gItemNodes = {};
    for (const nodeId in gNodes) {
        const node = gNodes[nodeId];
        if (!node.items) continue;
        
        // Enrich node with parent map info
        const info = getRegionInfo(node.map);

        node.items.forEach(itemId => {
            const strId = String(itemId);
            if (!gItemNodes[strId]) gItemNodes[strId] = [];
            
            // Store reference + parent info: 
            // regionId (Grandparent), mapPlaceId (Parent/Map), zoneid (Self)
            gItemNodes[strId].push({ 
                ...node, 
                id: nodeId, 
                regionId: info.regionId,
                mapPlaceId: info.placeId,
                folklore: node.folklore // Capture folklore ID if present
            });
        });
    }
}

function getIconUrl(itemId) {
    const DEFAULT_ICON = 'https://xivapi.com/i/066000/066313_hr1.png';
    if (!itemId) return DEFAULT_ICON;
    const iconPath = gIcons[itemId]; 
    if (!iconPath) return DEFAULT_ICON;
    
    return `https://xivapi.com${iconPath}`;
}

// Helper to get localized text
// type: 'ui' | 'item' | 'place'
function t(key, type = 'ui') {
    const lang = currentLang === 'zh-TW' ? 'tw' : (currentLang === 'zh-CN' ? 'zh' : currentLang);

    if (type === 'ui') {
        if (!gUiLocales[currentLang]) return key;
        return gUiLocales[currentLang][key] || key;
    }
    
    if (type === 'item') {
        const item = gItems[key];
        if (!item) return `Item#${key}`;
        if (lang === 'tw' && !item.tw && item.zh) return item.zh;
        return item[lang] || item.en || `Item#${key}`;
    }

    if (type === 'place') {
        if (!key || key == "0") return t('unknown_location');
        const place = gPlaces[key];
        if (!place) return `Place#${key}`;
        if (lang === 'tw' && !place.tw && place.zh) return place.zh;
        return place[lang] || place.en || `Place#${key}`;
    }

    return key;
}

function updateStickyOffsets() {
    const mainNav = document.getElementById('main-nav');
    const levelNav = document.getElementById('level-nav-container');

    if (mainNav && levelNav) {
        const navH = mainNav.offsetHeight;
        const lvlH = levelNav.offsetHeight;
        const totalOffset = navH + lvlH;
        levelNav.style.top = `${navH}px`;
        document.documentElement.style.setProperty('--header-offset', `${totalOffset - 1}px`);
    }
}

function changeLang(lang) {
    currentLang = lang;
    localStorage.setItem('ff14_lang_pref', lang);
    updateLangButtons();
    render();
    setTimeout(updateStickyOffsets, 50);
}

function updateLangButtons() {
    ['zh-TW', 'zh-CN', 'en', 'ja'].forEach(lang => {
        let btnId = '';
        if (lang === 'zh-TW') btnId = 'lang-tw';
        else if (lang === 'zh-CN') btnId = 'lang-cn';
        else btnId = `lang-${lang}`;

        const btn = document.getElementById(btnId);
        if (lang === currentLang) {
            btn.className = "px-2 py-0.5 text-xs rounded bg-blue-600 text-white font-bold shadow";
        } else {
            btn.className = "px-2 py-0.5 text-xs rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors";
        }
    });
}

// --- Search Feature ---
let searchDebounceTimer = null;
let searchSelectedIndex = -1;

function handleSearchInput(event) {
    const query = event.target.value.trim();
    const clearBtn = document.getElementById('search-clear');
    
    // Toggle clear button visibility
    if (query.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
        hideSearchResults();
        return;
    }
    
    // Debounce search
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        const results = searchItems(query);
        renderSearchResults(results, query);
    }, 150);
}

function handleSearchKeydown(event) {
    const resultsContainer = document.getElementById('search-results');
    const items = resultsContainer.querySelectorAll('.search-result-item');
    
    if (items.length === 0) return;
    
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        searchSelectedIndex = Math.min(searchSelectedIndex + 1, items.length - 1);
        updateSearchSelection(items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        searchSelectedIndex = Math.max(searchSelectedIndex - 1, 0);
        updateSearchSelection(items);
    } else if (event.key === 'Enter' && searchSelectedIndex >= 0) {
        event.preventDefault();
        items[searchSelectedIndex].click();
    } else if (event.key === 'Escape') {
        hideSearchResults();
        document.getElementById('search-input').blur();
    }
}

function updateSearchSelection(items) {
    items.forEach((item, idx) => {
        if (idx === searchSelectedIndex) {
            item.classList.add('bg-blue-100', 'dark:bg-blue-900/40');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('bg-blue-100', 'dark:bg-blue-900/40');
        }
    });
}

function searchItems(query) {
    if (!query || query.length < 1) return [];
    
    const lowerQuery = query.toLowerCase();
    const results = [];
    const maxResults = 20;
    
    // In timed view mode, only search cached timed nodes
    if (currentViewMode === 'timed' && window.timedNodeDataCache) {
        const seenIds = new Set();
        for (const node of window.timedNodeDataCache) {
            if (results.length >= maxResults) break;
            if (seenIds.has(node.itemId)) continue;
            
            const item = gItems[node.itemId];
            if (!item) continue;
            
            const names = [item.en, item.ja, item.tw, item.zh].filter(Boolean);
            const matchedName = names.find(name => name.toLowerCase().includes(lowerQuery));
            
            if (matchedName) {
                seenIds.add(node.itemId);
                const displayName = t(node.itemId, 'item');
                results.push({
                    itemId: node.itemId,
                    displayName,
                    matchedName: matchedName !== displayName ? matchedName : null,
                    pageInfo: { isTimed: true, status: node.status, mapName: node.mapName },
                    iconUrl: getIconUrl(node.itemId)
                });
            }
        }
        return results;
    }
    
    // Normal search through all items
    for (const itemId in gItems) {
        if (results.length >= maxResults) break;
        
        const item = gItems[itemId];
        const names = [item.en, item.ja, item.tw, item.zh, item.de, item.fr].filter(Boolean);
        
        // Check if any localized name contains the query
        const matchedName = names.find(name => name.toLowerCase().includes(lowerQuery));
        
        if (matchedName) {
            // Get display name in current language
            const displayName = t(itemId, 'item');
            
            // Find which page/section this item belongs to
            const pageInfo = findItemPage(itemId);
            
            results.push({
                itemId,
                displayName,
                matchedName: matchedName !== displayName ? matchedName : null,
                pageInfo,
                iconUrl: getIconUrl(itemId)
            });
        }
    }
    
    return results;
}

function findItemPage(itemId) {
    // Search through all pages to find which one contains this item
    for (let pageIdx = 0; pageIdx < gLogPages.length; pageIdx++) {
        const pages = gLogPages[pageIdx];
        for (const page of pages) {
            const found = page.items.find(i => String(i.itemId) === String(itemId));
            if (found) {
                return {
                    pageId: page.id,
                    pageIdx,
                    startLevel: page.startLevel,
                    itemLevel: found.lvl
                };
            }
        }
    }
    return null;
}

function renderSearchResults(results, query) {
    const container = document.getElementById('search-results');
    const searchInput = document.getElementById('search-input');
    searchSelectedIndex = -1;
    
    // Position the fixed dropdown below the search input
    if (searchInput) {
        const rect = searchInput.getBoundingClientRect();
        container.style.top = `${rect.bottom + 4}px`;
        container.style.left = `${rect.left}px`;
        container.style.width = `${Math.max(rect.width, 350)}px`;
    }
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                ${t('search_no_results')}
            </div>
        `;
        container.classList.remove('hidden');
        return;
    }
    
    let html = '';
    results.forEach((result, idx) => {
        let locName = result.pageInfo?.mapName || '';
        if (locName.includes('#0') || locName.includes('#undefined')) {
            locName = t('unknown_location');
        }
        
        const levelText = result.pageInfo?.isTimed 
            ? locName 
            : (result.pageInfo ? `Lv.${result.pageInfo.itemLevel}` : '');
        const matchHint = result.matchedName ? `<span class="text-xs text-slate-400 ml-2">(${result.matchedName})</span>` : '';
        
        html += `
            <div class="search-result-item flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
                 onclick="selectSearchResult('${result.itemId}', '${result.pageInfo?.pageId || ''}')"
                 data-index="${idx}">
                <img src="${result.iconUrl}" class="w-8 h-8 rounded border border-slate-200 dark:border-slate-600" alt="" loading="lazy" 
                     onerror="this.src='https://xivapi.com/i/066000/066313_hr1.png'">
                <div class="flex-grow min-w-0">
                    <div class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        ${highlightMatch(result.displayName, query)}${matchHint}
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">${levelText}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.classList.remove('hidden');
}

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">$1</mark>');
}

function selectSearchResult(itemId, pageId) {
    hideSearchResults();
    clearSearch();
    
    // Determine which job type this item belongs to
    const pageInfo = findItemPage(itemId);
    if (pageInfo) {
        // Switch to correct gather type based on page index
        const typeMap = ['mining', 'quarrying', 'harvesting', 'logging'];
        if (pageInfo.pageIdx >= 0 && pageInfo.pageIdx < typeMap.length) {
            const targetType = typeMap[pageInfo.pageIdx];
            if (currentGatherType !== targetType) {
                switchGatherType(targetType);
            }
        }
    }
    
    // Allow render to complete, then scroll and highlight
    setTimeout(() => {
        scrollToAndHighlightItem(itemId, pageId);
    }, 100);
}

function scrollToAndHighlightItem(itemId, pageId) {
    // First scroll to section
    if (pageId) {
        const section = document.getElementById(`section-${pageId}`);
        if (section) {
            const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-offset')) || 150;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = section.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset - 10;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }
    
    // Find and highlight the specific item row
    setTimeout(() => {
        // Look for checkbox with this itemId
        const checkbox = document.querySelector(`input[onchange="toggleItem('${itemId}')"]`);
        if (checkbox) {
            const itemRow = checkbox.closest('.group');
            if (itemRow) {
                // Scroll item into view
                itemRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Add highlight animation
                itemRow.classList.add('ring-2', 'ring-yellow-500', 'ring-offset-2', 'dark:ring-offset-slate-800');
                setTimeout(() => {
                    itemRow.classList.remove('ring-2', 'ring-yellow-500', 'ring-offset-2', 'dark:ring-offset-slate-800');
                }, 2000);
            }
        }
    }, 400);
}

function hideSearchResults() {
    const container = document.getElementById('search-results');
    container.classList.add('hidden');
    container.innerHTML = '';
    searchSelectedIndex = -1;
}

function clearSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    input.value = '';
    clearBtn.classList.add('hidden');
    hideSearchResults();
}

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    const searchContainer = document.getElementById('search-container');
    if (searchContainer && !searchContainer.contains(e.target)) {
        hideSearchResults();
    }
});

function render() {
    // Update UI Labels
    document.getElementById('ui-title').innerText = t('title');
    document.getElementById('ui-progress').innerText = t('progress');
    document.getElementById('ui-jump-to').innerText = t('jump_to');
    document.getElementById('ui-hide-completed').innerText = t('hide_completed');
    document.getElementById('ui-show-bookmarks').innerText = `⭐ ${t('show_bookmarks')}`;
    document.getElementById('search-input').placeholder = t('search_placeholder');
    document.getElementById('btn-miner')?.setAttribute('hidden', true); // Cleanup if exists
    document.getElementById('btn-botanist')?.setAttribute('hidden', true);
    // updateJobButtons(); // Removed
    updateTypeButtons();

    // Update Pinned Job Label (shown only when pinned)
    const pinnedLabel = document.getElementById('pinned-job-label');
    if (pinnedLabel) {
        const typeName = t(currentGatherType);
        const typeIcon = UI_ICONS[currentGatherType];
        
        let iconHtml = '';
        if (typeIcon) {
             const isIconUrl = typeIcon.startsWith('http');
             iconHtml = isIconUrl ? `<img src="${typeIcon}" class="w-5 h-5">` : typeIcon;
        } else {
             // Fallback icons if UI_ICONS missing
             const fallbacks = { 'mining': '⛏️', 'quarrying': '🔨', 'logging': '🪓', 'harvesting': '🌾' };
             iconHtml = fallbacks[currentGatherType] || '';
        }

        pinnedLabel.innerHTML = `${iconHtml} ${typeName}`;
    }

    // Setup Layout
    document.getElementById('region-sidebar').style.display = 'block'; 
    document.getElementById('region-sidebar').className = "w-full md:w-56 shrink-0 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 sticky top-24 max-h-[85vh] overflow-y-auto thin-scrollbar shadow-lg z-40 transition-colors hidden overscroll-contain";
    document.getElementById('content-area').className = "flex-grow w-full min-w-0 relative";

    const listContainer = document.getElementById('list-container');
    const navGrid = document.getElementById('level-grid');
    listContainer.innerHTML = '';
    navGrid.innerHTML = '';

    // Determine Job Pages based on job and gather type
    // gLogPages: [0]=Mining, [1]=Quarrying, [2]=Harvesting, [3]=Logging
    const pageIndices = PAGE_INDEX_CONFIG[currentJob][currentGatherType] || PAGE_INDEX_CONFIG[currentJob].all;
    
    // Combine pages from selected indices
    let allJobPages = [];
    pageIndices.forEach(idx => {
        if (gLogPages[idx]) {
            allJobPages = allJobPages.concat(gLogPages[idx]);
        }
    });

    if (allJobPages.length === 0) {
        listContainer.innerHTML = '<div class="p-5 text-center col-span-full">No data found for this job.</div>';
        return;
    }

    // --- Collect Available Zones for Sidebar ---
    const availableZones = new Set();
    
    // --- Render Logic ---
    let totalItemsCount = 0;
    let totalCompletedCount = 0;
    
    // Reset Folklore Break Flag
    window._hasInsertedFolkloreBreak = false;

    allJobPages.forEach(page => {
        // Page Grouping Logic
        const startLvl = page.startLevel;
        const pageId = page.id;
        let levelRange = `Lv. ${startLvl} - ${startLvl + 4}`;
        const sectionId = `section-${pageId}`;
        
        const itemsInPage = page.items;
        
        // Filter items by Region (and collect zones)
        const relevantItems = [];
        let detectedFolkloreId = null;

        itemsInPage.forEach(itemEntry => {
            const itemId = String(itemEntry.itemId);
            const nodes = gItemNodes[itemId] || [];
            
            // Check for Folklore (Use first found)
            if (!detectedFolkloreId && nodes.length > 0 && nodes[0].folklore) {
                detectedFolkloreId = nodes[0].folklore;
            }

            // Collect Maps for sidebar (from ALL items in this job book)
            // We store the MapPlaceID (e.g. Central Thanalan ID) not the RegionID (Thanalan)
            // But we need the RegionID for grouping. 
            // Let's store objects: { regionId, mapPlaceId }
            nodes.forEach(n => {
                if (n.mapPlaceId && n.regionId) {
                    const key = `${n.regionId}-${n.mapPlaceId}`;
                    if (!availableZones.has(key)) availableZones.add(key);
                }
            });

            // Filter for Main View
            let inRegion = false;
            if (currentRegion === 'all') inRegion = true;
            else {
                // currentRegion will now be a specific mapPlaceId (e.g. 43 for Central Thanalan)
                // match n.mapPlaceId
                if (nodes.some(n => String(n.mapPlaceId) === currentRegion)) inRegion = true;
            }

            // No need to filter by type here - pages are already separated by gather type
            if (inRegion) {
                relevantItems.push(itemEntry);
            }
        });

        // Loop Logic
        // If currentRegion filters out all items in a page, we might still want to show the page header or just skip?
        // Let's skip empty sections if filtered
        if (relevantItems.length === 0) return;

        // Update Title if Folklore
        if (detectedFolkloreId) {
            levelRange = t(detectedFolkloreId, 'item');
        }

        const pTotal = relevantItems.length;
        const pCompleted = relevantItems.filter(i => completedItems.has(String(i.itemId))).length;
        const isAllDone = pCompleted === pTotal;

        totalItemsCount += pTotal;
        totalCompletedCount += pCompleted;

        // Nav Button - Only show if not fully filtered out (or simplified: always show if there are items)
        // Nav Button
        // If HideCompleted is ON and page is All Done, we "Disable" the button visually but keep it.
        const isDisabled = gHideCompleted && isAllDone;
        
        let btnClass = "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600";
        let progressColor = "text-slate-400";

        if (isAllDone) {
            btnClass = "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700/50 hover:bg-green-200 dark:hover:bg-green-900/60";
            progressColor = "text-green-600 dark:text-green-300";
        } else if (pCompleted > 0) {
            btnClass = "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/50 hover:bg-blue-200 dark:hover:bg-blue-900/60";
            progressColor = "text-blue-600 dark:text-blue-200";
        }

        const navBtn = document.createElement('button');
        navBtn.onclick = () => {
            if (isDisabled) return;
            scrollToSection(`section-${pageId}`);
        };

        const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''; // Removed hover effects for disabled
        
        navBtn.className = `px-3 py-1.5 rounded-md border text-xs font-bold transition-all flex items-center gap-2 shadow-sm shrink-0 ${btnClass} ${disabledClasses}`;
        
        let btnLabel = `Lv${startLvl}~${startLvl + 4}`;
        if (detectedFolkloreId) btnLabel = levelRange; // Use the full name (or could truncate)
        
        // --- Folklore Line Break Logic ---
        // If this is a folklore item and we haven't broken the line yet
        if (detectedFolkloreId && !window._hasInsertedFolkloreBreak) {
             const breakDiv = document.createElement('div');
             breakDiv.className = "w-full h-0 basis-full my-1"; // Force new line
             // Add a small label or separator if needed? user just said "jump line"
             navGrid.appendChild(breakDiv);
             window._hasInsertedFolkloreBreak = true;
        }

        navBtn.innerHTML = `
            <span class="truncate max-w-[150px]">${btnLabel}</span>
            <span class="${progressColor} font-mono opacity-80 text-[10px] border-l border-slate-300 dark:border-white/10 pl-2">
                ${Math.round((pCompleted / pTotal) * 100)}%
            </span>
        `;
        navGrid.appendChild(navBtn);

        // Generate Items HTML
        let itemsHtml = '';
        let visibleCount = 0;
        
        relevantItems.forEach(item => {
            const itemId = item.itemId;
            const isChecked = completedItems.has(String(itemId));
            
            // HIDE LOGIC: Filter VISIBILITY here
            if (gHideCompleted && isChecked) return;
            
            // BOOKMARK FILTER: Only show bookmarked items if enabled
            const isBookmarked = bookmarkedItems.has(String(itemId));
            if (gShowBookmarksOnly && !isBookmarked) return;

            visibleCount++;
            const itemName = t(itemId, 'item');
            
            const itemRow = document.createElement('div');
            itemRow.className = `group flex items-start p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ${isChecked ? 'checked-item bg-slate-50 dark:bg-slate-800/50' : ''}`;
            
            // Icon Html
            const iconUrl = getIconUrl(itemId);
            const iconHtml = `<img src="${iconUrl}" class="w-10 h-10 rounded mr-3 border border-slate-300 dark:border-slate-600 shadow-sm shrink-0 bg-slate-800" alt="" loading="lazy" onerror="this.src='https://xivapi.com/i/066000/066313_hr1.png'">`;
            
            // Locations & Time
            let locHtml = '';
            let timeHtml = '';
            let folkloreHtml = '';

            const nodes = gItemNodes[String(itemId)] || []; 
            if (nodes.length > 0) {
                // Special handling for Shards/Crystals/Clusters (IDs < 20) which are everywhere
                // Collapse them to avoid clutter
                if (parseInt(itemId) < 20) {
                    locHtml = `<div class="text-xs mt-1 text-slate-500 dark:text-slate-400">📍 ${t('ui_omitted')}</div>`;
                } else {
                    // Determine Locations
                    const locs = nodes.map(n => {
                        if (!n.mapPlaceId) return null; // Skip invalid places
                        const placeName = t(n.mapPlaceId, 'place');
                        const hasCoords = n.x && n.y && n.map;
                        if (hasCoords) {
                            const coordsText = `(X:${n.x}, Y:${n.y})`;
                            // Make coords clickable to show map
                            return `<span class="text-slate-500 dark:text-slate-400">📍 ${placeName} <button onclick="showMapModal(${n.map}, ${n.x}, ${n.y}, '${itemName.replace(/'/g, "\\'")}', event)" class="text-xs ml-1 opacity-75 hover:opacity-100 hover:text-blue-500 cursor-pointer transition-colors font-mono">${coordsText}</button></span>`;
                        } else {
                            return `<span class="text-slate-500 dark:text-slate-400">📍 ${placeName}</span>`;
                        }
                    }).filter(Boolean).join('<br>'); // Filter out nulls
                    
                    if (locs) {
                        locHtml = `<div class="text-xs mt-1 items-center gap-1">${locs}</div>`;
                    } else {
                        // Fallback if no valid locations found (e.g. only map 0)
                        locHtml = `<div class="text-xs mt-1 text-slate-500 dark:text-slate-400">📍 ${t('time_any')}</div>`; 
                    }
                }

                // Determine Folklore
                if (nodes[0].folklore) {
                    const bookName = t(nodes[0].folklore, 'item');
                    folkloreHtml = `<img src="${UI_ICONS.folklore}" title="${bookName}" onclick="copyToClipboard('${bookName.replace(/'/g, "\\'")}', event)" class="inline-block w-5 h-5 ml-1 cursor-pointer hover:scale-110 transition-transform active:scale-95" alt="Folklore">`;
                }

                // Determine Time & Timer
                const activeNodes = nodes.filter(n => n.spawns && n.spawns.length > 0);
                
                // Static Time Text
                const times = nodes.map(n => {
                    if (n.spawns && n.spawns.length > 0) {
                        return n.spawns.map(h => `${String(h).padStart(2, '0')}:00`).join('/');
                    }
                    return '';
                }).filter(Boolean).join(', ');
                
                if (times) timeHtml = `<div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">⏰ ${times}</div>`;

                // Live Timer Placeholder
                if (activeNodes.length > 0) {
                    // Use the first active node for timer (usually items only have one timed node source?)
                    // If multiple, just pick first for UI simplicity
                    const node = activeNodes[0];
                    timeHtml += `<div class="timed-node-timer mt-1" data-node-id="${node.id}" data-spawns="${node.spawns.join(',')}" data-duration="${node.duration || 0}"></div>`;
                }
            }

            // Bookmark button HTML
            const bookmarkClass = isBookmarked ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500';
            const bookmarkTitle = isBookmarked ? t('remove_bookmark') : t('add_bookmark');
            const bookmarkHtml = `
                <button onclick="toggleBookmark('${itemId}', event)" class="${bookmarkClass} transition-colors ml-1" title="${bookmarkTitle}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
            `;

            itemRow.innerHTML = `
                <div class="mr-3 mt-1 shrink-0 flex items-center">
                    <input type="checkbox" 
                        class="custom-checkbox w-5 h-5 cursor-pointer text-slate-800 dark:text-slate-200"
                        ${isChecked ? 'checked' : ''} 
                        onchange="toggleItem('${itemId}')">
                </div>
                
                <div class="flex-grow min-w-0 cursor-pointer flex items-center gap-3" onclick="toggleItem('${itemId}', true)">
                    ${iconHtml}
                    <div class="flex-grow min-w-0 flex flex-col justify-center">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-slate-800 dark:text-slate-100 item-name text-base leading-tight">${itemName}</span>
                            <button onclick="copyToClipboard('${itemName.replace(/'/g, "\\'")}', event)" class="text-slate-400 hover:text-blue-500 transition-colors" title="${t('copy_name')}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                            ${bookmarkHtml}
                            ${item.stars ? `<span class="text-yellow-500 text-xs font-bold border border-yellow-500/30 px-1 rounded">★${item.stars}</span>` : ''}
                            ${item.hidden ? `<span class="text-red-400 text-xs border border-red-400/30 px-1 rounded">Hidden</span>` : ''}
                            ${folkloreHtml}
                        </div>
                        <div class="mt-1 space-y-0.5">
                            ${locHtml}
                            ${timeHtml}
                        </div>
                        <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Lv. ${item.lvl}
                        </div>
                    </div>
                </div>
            `;
            itemsHtml += itemRow.outerHTML;
        });

        // Section
        // If gHideCompleted is true AND visibleCount is 0, we hide the section entirely.
        if (gHideCompleted && visibleCount === 0) return; 

        const section = document.createElement('section');
        section.id = `section-${pageId}`;
        section.className = "relative bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm h-fit pb-1 transition-colors mb-0 break-inside-avoid";

        // Create list of item IDs for batch operations
        const itemIds = relevantItems.map(i => i.itemId).join(',');
        const batchBtnText = isAllDone ? t('deselect_all') : t('select_all');
        const batchBtnAction = isAllDone ? 'false' : 'true';

        section.innerHTML = `
            <div class="section-header-sticky rounded-t-lg bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex justify-between items-center shadow-md transition-colors">
                <h2 class="font-bold text-slate-800 dark:text-slate-200">${levelRange}</h2>
                <div class="flex items-center gap-2">
                    <button onclick="toggleAllInSection('${itemIds}', ${batchBtnAction})" 
                        class="text-[10px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        ${batchBtnText}
                    </button>
                    <span class="text-xs font-mono ${isAllDone ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}">
                        ${isAllDone ? t('done') : `${pCompleted}/${pTotal}`}
                    </span>
                </div>
            </div>
            <div class="divide-y divide-slate-200 dark:divide-slate-700/50">
                ${itemsHtml}
            </div>
        `;
        listContainer.appendChild(section);
    });

    // Update Global Progress
    const globalPercent = totalItemsCount === 0 ? 0 : Math.round((totalCompletedCount / totalItemsCount) * 100);
    document.getElementById('progress-text').innerText = `${totalCompletedCount}/${totalItemsCount} (${globalPercent}%)`;
    
    updateStickyOffsets();
    updateSidebar(availableZones);
}

function setJob(job) {
    currentJob = job;
    currentRegion = 'all';
    // Default to first type for the job
    if (job === 'miner') currentGatherType = 'mining';
    else currentGatherType = 'logging'; 
    render();
}

function setGatherType(type) {
    currentGatherType = type;
    render();
}

function switchGatherType(type) {
    // Determine job from type
    if (['mining', 'quarrying'].includes(type)) {
        currentJob = 'miner';
    } else {
        currentJob = 'botanist';
    }
    currentGatherType = type;
    currentRegion = 'all';
    render();
}

function updateTypeButtons() {
    const container = document.getElementById('type-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Show all 4 types
    const types = ['mining', 'quarrying', 'logging', 'harvesting'];
    
    const activeClass = "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20 ring-2 ring-blue-500 border-transparent scale-105";
    const inactiveClass = "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50";
    
    types.forEach(type => {
        const btn = document.createElement('button');
        const isActive = currentViewMode === 'level' && currentGatherType === type;
        btn.className = `px-4 py-1 rounded-full text-md font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 border shadow-sm ${isActive ? activeClass : inactiveClass}`;
        
        // Add Icon if available
        let iconHtml = '';
        if (UI_ICONS[type]) {
            iconHtml = `<img src="${UI_ICONS[type]}" class="w-5 h-5">`;
        }

        btn.innerHTML = `${iconHtml}${t(type)}`;
        btn.onclick = () => {
            currentViewMode = 'level';
            updateViewModeButtons();
            switchGatherType(type);
        };
        container.appendChild(btn);
    });
}
// updateJobButtons removed

function toggleItem(id) {
    if (completedItems.has(id)) completedItems.delete(id);
    else completedItems.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedItems]));
    render();
}

function toggleAllInSection(itemIdsStr, checked) {
    const itemIds = itemIdsStr.split(',').filter(Boolean);
    
    itemIds.forEach(id => {
        if (checked) {
            completedItems.add(String(id));
        } else {
            completedItems.delete(String(id));
        }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedItems]));
    render();
}

function toggleBookmark(id, event) {
    event.stopPropagation();
    id = String(id);
    
    if (bookmarkedItems.has(id)) {
        bookmarkedItems.delete(id);
    } else {
        bookmarkedItems.add(id);
    }
    
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify([...bookmarkedItems]));
    render();
}

function toggleShowBookmarks() {
    gShowBookmarksOnly = document.getElementById('show-bookmarks-check').checked;
    render();
}

function toggleHideCompleted() {
    gHideCompleted = document.getElementById('hide-completed-check').checked;
    render();
}

// --- View Mode Functions ---
function switchToLevelView() {
    currentViewMode = 'level';
    updateViewModeButtons();
    // Show region sidebar again
    document.getElementById('region-sidebar').style.display = '';
    render();
}

function updateViewModeButtons() {
    const baseClass = 'px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2';
    // Active: White card (light) / Slate-600 (dark), shadow, colored text
    const activeBase = 'bg-white dark:bg-slate-600 shadow-sm';
    
    // Inactive: Transparent, muted text, hover effect
    const inactiveClass = `${baseClass} text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white`;
    
    const levelBtn = document.getElementById('view-mode-level');
    const timedBtn = document.getElementById('view-mode-timed');
    const mapBtn = document.getElementById('view-mode-map');
    
    if (levelBtn) {
        if (currentViewMode === 'level') {
            levelBtn.className = `${baseClass} ${activeBase} text-blue-600 dark:text-blue-300`;
        } else {
            levelBtn.className = inactiveClass;
        }
    }
    if (timedBtn) {
        if (currentViewMode === 'timed') {
            timedBtn.className = `${baseClass} ${activeBase} text-amber-600 dark:text-amber-300`;
        } else {
            timedBtn.className = inactiveClass;
        }
    }
    if (mapBtn) {
        if (currentViewMode === 'map') {
            mapBtn.className = `${baseClass} ${activeBase} text-emerald-600 dark:text-emerald-300`;
        } else {
            mapBtn.className = inactiveClass;
        }
    }
}

// --- Map View Mode ---
function switchToMapView() {
    currentViewMode = 'map';
    updateViewModeButtons();
    renderMapView();
}

function renderMapView() {
    const listContainer = document.getElementById('list-container');
    const navGrid = document.getElementById('level-grid');
    
    listContainer.innerHTML = '';
    navGrid.innerHTML = '';
    
    // Hide region sidebar for map view
    document.getElementById('region-sidebar').style.display = 'none';
    
    // Collect maps that have gathering nodes
    const mapsWithNodes = new Map();
    
    for (const nodeId in gNodes) {
        const node = gNodes[nodeId];
        if (!node.map || !node.x || !node.y) continue;
        if (!node.items || node.items.length === 0) continue;
        
        const mapId = node.map;
        if (!mapsWithNodes.has(mapId)) {
            mapsWithNodes.set(mapId, []);
        }
        
        node.items.forEach(itemId => {
            mapsWithNodes.get(mapId).push({
                nodeId,
                itemId: String(itemId),
                x: node.x,
                y: node.y,
                type: node.type,
                level: node.level,
                spawns: node.spawns,
                limited: node.limited
            });
        });
    }
    
    // Create UI
    const container = document.createElement('div');
    container.className = 'col-span-full space-y-4';
    
    // Map Selector
    const selectorHtml = `
        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div class="flex flex-wrap items-center gap-4">
                <label class="font-bold text-slate-700 dark:text-slate-300">${t('select_map')}:</label>
                <select id="map-selector" onchange="onMapSelect(this.value)" 
                    class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]">
                    <option value="">-- ${t('select_map')} --</option>
                    ${Array.from(mapsWithNodes.entries())
                        .sort((a, b) => a[0] - b[0])
                        .map(([mapId, nodes]) => {
                            const map = gMaps[mapId];
                            const mapName = map ? t(map.placename_id || mapId, 'place') : `Map ${mapId}`;
                            return `<option value="${mapId}" ${selectedMapId == mapId ? 'selected' : ''}>${mapName} (${nodes.length})</option>`;
                        }).join('')}
                </select>
                <button id="calc-path-btn" onclick="calculateOptimalPath()" 
                    class="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden"
                    disabled>
                    🧭 ${t('calculate_path')}
                </button>
            </div>
        </div>
    `;
    container.innerHTML = selectorHtml;
    
    // Map Display Area
    const mapArea = document.createElement('div');
    mapArea.id = 'map-view-container';
    mapArea.className = 'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm';
    
    if (selectedMapId && mapsWithNodes.has(Number(selectedMapId))) {
        renderMapWithNodes(mapArea, Number(selectedMapId), mapsWithNodes.get(Number(selectedMapId)));
    } else {
        mapArea.innerHTML = `<div class="text-center p-8 text-slate-500 dark:text-slate-400">${t('select_map')}</div>`;
    }
    
    container.appendChild(mapArea);
    listContainer.appendChild(container);
    
    // Update progress text
    document.getElementById('progress-text').innerText = `${mapsWithNodes.size} ${t('map_view')}`;
}

function onMapSelect(mapId) {
    selectedMapId = mapId ? Number(mapId) : null;
    renderMapView();
}

function renderMapWithNodes(container, mapId, nodes) {
    const map = gMaps[mapId];
    if (!map) {
        container.innerHTML = '<div class="text-center p-4 text-red-500">Map data not found</div>';
        return;
    }
    
    const mapName = t(map.placename_id || mapId, 'place');
    const sizeFactor = map.size_factor || 100;
    const c = sizeFactor / 100;
    
    // Deduplicate nodes by position
    const uniqueNodes = [];
    const posSet = new Set();
    nodes.forEach(node => {
        const posKey = `${node.x.toFixed(1)},${node.y.toFixed(1)}`;
        if (!posSet.has(posKey)) {
            posSet.add(posKey);
            uniqueNodes.push(node);
        }
    });
    
    // Enable path button
    const pathBtn = document.getElementById('calc-path-btn');
    if (pathBtn) {
        pathBtn.classList.remove('hidden');
        pathBtn.disabled = uniqueNodes.length < 2;
    }
    
    container.innerHTML = `
        <div class="mb-4 flex items-center justify-between">
            <h3 class="font-bold text-lg text-slate-800 dark:text-slate-200">${mapName}</h3>
            <span class="text-sm text-slate-500 dark:text-slate-400">${uniqueNodes.length} ${t('gathering_nodes')}</span>
        </div>
        <div id="map-canvas-container" class="relative aspect-square bg-slate-900 rounded-lg overflow-hidden cursor-crosshair">
            <img src="${map.image}" class="w-full h-full object-contain" alt="${mapName}" loading="lazy">
            <svg id="path-overlay" class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
            ${uniqueNodes.map((node, i) => {
                const pixelX = ((node.x - 1) * c / 41 + 1) / 42 * 100;
                const pixelY = ((node.y - 1) * c / 41 + 1) / 42 * 100;
                const typeColors = { 1: '#3B82F6', 2: '#8B5CF6', 3: '#22C55E', 4: '#84CC16' };
                const color = typeColors[node.type] || '#EF4444';
                const itemName = t(node.itemId, 'item');
                
                return `
                    <div class="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 transition-transform group z-10"
                         style="left: ${pixelX}%; top: ${pixelY}%;"
                         onclick="showMapModal(${mapId}, ${node.x}, ${node.y}, '${itemName.replace(/'/g, "\\'")}', event)"
                         data-node-index="${i}" data-x="${node.x}" data-y="${node.y}">
                        <div class="w-full h-full rounded-full border-2 border-white shadow-md" style="background-color: ${color}"></div>
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            ${itemName} Lv.${node.level}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 justify-center">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> 採掘</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> 碎石</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500 inline-block"></span> 伐木</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-lime-500 inline-block"></span> 割草</span>
        </div>
    `;
}

// Store nodes for path calculation
let currentMapNodes = [];

function calculateOptimalPath() {
    if (!selectedMapId) return;
    
    // Get node positions from DOM
    const nodeElements = document.querySelectorAll('[data-node-index]');
    const nodes = Array.from(nodeElements).map(el => ({
        index: parseInt(el.dataset.nodeIndex),
        x: parseFloat(el.dataset.x),
        y: parseFloat(el.dataset.y),
        element: el
    }));
    
    if (nodes.length < 2) return;
    
    // Simple nearest neighbor TSP
    const path = nearestNeighborTSP(nodes);
    
    // Draw path on SVG overlay
    drawPath(path);
    
    // Show toast
    showToast(`${t('optimal_path')}: ${path.length} points`);
}

function nearestNeighborTSP(nodes) {
    if (nodes.length === 0) return [];
    
    const visited = new Set();
    const path = [];
    
    // Start from first node (or could be random/configurable)
    let current = nodes[0];
    path.push(current);
    visited.add(current.index);
    
    while (visited.size < nodes.length) {
        let nearestDist = Infinity;
        let nearest = null;
        
        for (const node of nodes) {
            if (visited.has(node.index)) continue;
            
            const dist = Math.sqrt(
                Math.pow(node.x - current.x, 2) + 
                Math.pow(node.y - current.y, 2)
            );
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = node;
            }
        }
        
        if (nearest) {
            path.push(nearest);
            visited.add(nearest.index);
            current = nearest;
        }
    }
    
    return path;
}

function drawPath(path) {
    const svg = document.getElementById('path-overlay');
    if (!svg) return;
    
    const map = gMaps[selectedMapId];
    if (!map) return;
    
    const sizeFactor = map.size_factor || 100;
    const c = sizeFactor / 100;
    
    // Create path lines
    let pathD = '';
    path.forEach((node, i) => {
        const pixelX = ((node.x - 1) * c / 41 + 1) / 42 * 100;
        const pixelY = ((node.y - 1) * c / 41 + 1) / 42 * 100;
        
        if (i === 0) {
            pathD += `M ${pixelX} ${pixelY}`;
        } else {
            pathD += ` L ${pixelX} ${pixelY}`;
        }
    });
    
    svg.innerHTML = `
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" />
            </marker>
        </defs>
        <path d="${pathD}" fill="none" stroke="#F59E0B" stroke-width="0.3" stroke-dasharray="0.5,0.3" marker-end="url(#arrowhead)" />
    `;
    
    // Add numbers to nodes
    path.forEach((node, i) => {
        const el = node.element;
        if (el) {
            const badge = document.createElement('div');
            badge.className = 'absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-30';
            badge.innerText = i + 1;
            el.appendChild(badge);
        }
    });
}

function switchToTimedView() {
    currentViewMode = 'timed';
    updateViewModeButtons();
    renderTimedView();
}

function renderTimedView() {
    const listContainer = document.getElementById('list-container');
    const navGrid = document.getElementById('level-grid');
    
    listContainer.innerHTML = '';
    navGrid.innerHTML = '';
    
    // Hide region sidebar for timed view
    document.getElementById('region-sidebar').style.display = 'none';
    
    // Collect all timed nodes from ALL pages (all jobs)
    const timedNodeData = [];
    
    for (const nodeId in gNodes) {
        const node = gNodes[nodeId];
        if (!node.spawns || node.spawns.length === 0) continue;
        
        // Get item info
        if (!node.items || node.items.length === 0) continue;
        
        node.items.forEach(itemId => {
            const item = gItems[itemId];
            if (!item) return;
            
            const mapInfo = getRegionInfo(node.map);
            // Determine expansion based on map region
            const expansion = EXPANSION_MAP[mapInfo.placeId] || 'exp_2';
            
            timedNodeData.push({
                nodeId,
                itemId: String(itemId),
                itemName: t(itemId, 'item'),
                spawns: node.spawns,
                duration: node.duration || 60,
                level: node.level,
                type: node.type,
                x: node.x,
                y: node.y,
                map: node.map,
                mapPlaceId: mapInfo.placeId,
                mapName: t(mapInfo.placeId || mapInfo.regionId, 'place'),
                folklore: node.folklore,
                expansion
            });
        });
    }
    
    // Store for search
    window.timedNodeDataCache = timedNodeData;
    
    if (timedNodeData.length === 0) {
        listContainer.innerHTML = `<div class="col-span-full text-center p-8 text-slate-500 dark:text-slate-400">${t('no_timed_nodes')}</div>`;
        return;
    }
    
    // Calculate time status for each node
    const etDate = getEorzeaTime();
    const currentEth = etDate.getUTCHours();
    const currentEtTotalMin = currentEth * 60 + etDate.getUTCMinutes();
    
    timedNodeData.forEach(node => {
        const result = calculateNodeStatus(node.spawns, node.duration, currentEtTotalMin);
        node.status = result.status;
        node.minutesUntil = result.minutesUntil;
        node.minutesRemaining = result.minutesRemaining;
        node.progressPercent = result.progressPercent;
    });
    
    // Sort by status and time
    timedNodeData.sort((a, b) => {
        const statusOrder = { 'active': 0, 'soon': 1, 'later': 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        if (a.status === 'active') {
            return a.minutesRemaining - b.minutesRemaining;
        }
        return a.minutesUntil - b.minutesUntil;
    });
    
    // 1. Separate Active vs Inactive
    const activeNodes = [];
    const inactiveNodes = [];
    
    timedNodeData.forEach(node => {
        if (node.status === 'active') {
            activeNodes.push(node);
        } else {
            inactiveNodes.push(node);
        }
    });

    // Helper to sort by level then time
    const sortFolkloreKeys = (keys) => {
        const NO_FOLKLORE_KEY = 'base_game';
        keys.sort((a, b) => {
            if (a === NO_FOLKLORE_KEY) return -1;
            if (b === NO_FOLKLORE_KEY) return 1;
            const itemA = gItems[a];
            const itemB = gItems[b];
            const lvlA = itemA ? itemA.lvl : 0;
            const lvlB = itemB ? itemB.lvl : 0;
            return lvlA - lvlB;
        });
        return keys;
    };

    // 2. Group Active by Folklore
    const activeFolkloreGroups = {};
    const NO_FOLKLORE_KEY = 'base_game';
    activeNodes.forEach(item => {
        const key = item.folklore || NO_FOLKLORE_KEY;
        if (!activeFolkloreGroups[key]) activeFolkloreGroups[key] = [];
        activeFolkloreGroups[key].push(item);
    });
    
    // 3. Group Inactive by Folklore
    const inactiveFolkloreGroups = {};
    inactiveNodes.forEach(item => {
        const key = item.folklore || NO_FOLKLORE_KEY;
        if (!inactiveFolkloreGroups[key]) inactiveFolkloreGroups[key] = [];
        inactiveFolkloreGroups[key].push(item);
    });

    // 4. Render Active Groups
    if (activeNodes.length > 0) {
        let activeKeys = sortFolkloreKeys(Object.keys(activeFolkloreGroups));
        
        // Wrapper for all active stuff
        const activeWrapper = document.createElement('div');
        activeWrapper.className = "col-span-full bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/30 p-2 mb-6 ring-1 ring-green-500/20";
        listContainer.appendChild(activeWrapper);
        
        // Header for the whole active block
        const blockHeader = document.createElement('div');
        blockHeader.className = "px-2 py-2 mb-2 flex items-center gap-2 border-b border-green-200 dark:border-green-800/30";
        blockHeader.innerHTML = `
            <span class="animate-pulse text-xl">🟢</span>
            <span class="font-bold text-green-800 dark:text-green-300 text-lg">Currently Available</span>
            <span class="ml-auto text-xs font-bold bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-3 py-1 rounded-full border border-green-300 dark:border-green-700">${activeNodes.length} Nodes</span>
        `;
        activeWrapper.appendChild(blockHeader);

        activeKeys.forEach(key => {
            const items = activeFolkloreGroups[key];
            items.sort((a, b) => a.minutesRemaining - b.minutesRemaining); // Sort by time remaining
            
            let headerTitle = 'General / Base Game';
            if (key !== NO_FOLKLORE_KEY) headerTitle = t(key, 'item');
            
            const groupDiv = document.createElement('div');
            groupDiv.className = "mb-4 last:mb-0";
            groupDiv.innerHTML = `
                <div class="px-2 py-1.5 flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded border border-green-200 dark:border-green-800">
                        ${headerTitle}
                    </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
                    ${items.map(node => renderTimedNodeCard(node, node.status)).join('')}
                </div>
            `;
            activeWrapper.appendChild(groupDiv);
        });
    }

    // 5. Render Inactive Groups
    let inactiveKeys = sortFolkloreKeys(Object.keys(inactiveFolkloreGroups));
    
    inactiveKeys.forEach(key => {
        const items = inactiveFolkloreGroups[key];
        items.sort((a, b) => a.minutesUntil - b.minutesUntil);
        
        let headerTitle = 'General / Base Game'; 
        if (key !== NO_FOLKLORE_KEY) headerTitle = t(key, 'item');
        
        const section = document.createElement('section');
        section.className = "col-span-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-4 overflow-hidden";
        
        const innerHtml = `
            <div class="px-4 py-2 bg-slate-100 dark:bg-slate-700 font-bold flex items-center gap-2 border-b border-slate-200 dark:border-slate-600">
                <span class="text-slate-700 dark:text-slate-200">📚 ${headerTitle}</span>
                <span class="ml-auto text-xs font-normal text-slate-500 dark:text-slate-400">${items.length} items</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                ${items.map(node => renderTimedNodeCard(node, node.status)).join('')}
            </div>
        `;
        
        section.innerHTML = innerHtml;
        listContainer.appendChild(section);
    });
    
    // Update progress text for timed view
    document.getElementById('progress-text').innerText = `${timedNodeData.length} ${t('timed_nodes')}`;
}

function calculateNodeStatus(spawns, durationMin, currentEtTotalMin) {
    // Duration in ET minutes
    const duration = durationMin || 60; // Default 1 ET hour
    
    // Check if currently active
    for (const spawnHour of spawns) {
        const spawnMin = spawnHour * 60;
        const endMin = (spawnMin + duration) % 1440;
        
        // Handle wraparound
        if (endMin > spawnMin) {
            if (currentEtTotalMin >= spawnMin && currentEtTotalMin < endMin) {
                const elapsed = currentEtTotalMin - spawnMin;
                const progressPercent = (elapsed / duration) * 100;
                return { status: 'active', minutesUntil: 0, minutesRemaining: endMin - currentEtTotalMin, progressPercent };
            }
        } else {
            // Wraps around midnight
            if (currentEtTotalMin >= spawnMin || currentEtTotalMin < endMin) {
                const remaining = currentEtTotalMin >= spawnMin 
                    ? (1440 - currentEtTotalMin) + endMin 
                    : endMin - currentEtTotalMin;
                const elapsed = duration - remaining;
                const progressPercent = (elapsed / duration) * 100;
                return { status: 'active', minutesUntil: 0, minutesRemaining: remaining, progressPercent };
            }
        }
    }
    
    // Find next spawn
    let minMinutesUntil = Infinity;
    for (const spawnHour of spawns) {
        const spawnMin = spawnHour * 60;
        let minutesUntil = spawnMin - currentEtTotalMin;
        if (minutesUntil < 0) minutesUntil += 1440;
        if (minutesUntil < minMinutesUntil) minMinutesUntil = minutesUntil;
    }
    
    // Soon = within 60 ET minutes (~3 real minutes)
    const status = minMinutesUntil <= 60 ? 'soon' : 'later';
    // Calculate countdown progress for waiting nodes (100% at spawn time)
    const progressPercent = status === 'soon' ? ((60 - minMinutesUntil) / 60) * 100 : 0;
    return { status, minutesUntil: minMinutesUntil, minutesRemaining: 0, progressPercent };
}

function renderTimedNodeCard(node, status) {
    const isChecked = completedItems.has(node.itemId);
    const isBookmarked = bookmarkedItems.has(node.itemId);
    const iconUrl = getIconUrl(node.itemId);
    
    // Progress bar for active status
    const progressPercent = node.progressPercent || 0;
    const progressColor = status === 'active' ? 'bg-green-500' : (status === 'soon' ? 'bg-amber-500' : 'bg-slate-400');
    
    // Time Text
    const etToRealMinutes = (etMin) => Math.ceil(etMin * (70 / 1440));
    let timerHtml = '';
    const realMinutes = etToRealMinutes(node.minutesUntil);
    const remainingRealMin = etToRealMinutes(node.minutesRemaining);
    
    // We wrap ALL time displays in .timed-node-timer so they can be updated live
    // and so we can track status changes.
    // data-status helps us detect transitions (Active <-> Waiting)
    
    if (status === 'active') {
        timerHtml = `<div class="timed-node-timer w-full" data-spawns="${node.spawns.join(',')}" data-duration="${node.duration || 60}" data-status="active">
            <span class="text-green-600 dark:text-green-400 font-bold text-sm">Active (${remainingRealMin}m)</span>
        </div>`;
    } else if (status === 'soon') {
        timerHtml = `<div class="timed-node-timer inline-block" data-spawns="${node.spawns.join(',')}" data-duration="${node.duration || 60}" data-status="soon">
             <span class="text-amber-600 dark:text-amber-400 text-sm font-bold">in ${realMinutes}m</span>
        </div>`;
    } else {
        // Later - Default text
        let label = '';
        if (realMinutes > 60) {
             const hours = (realMinutes / 60).toFixed(1);
             label = `in ${hours}h`;
        } else {
             label = `in ${realMinutes}m`;
        }
        // Add class timed-node-timer so it gets checked for "Activating"
        timerHtml = `<div class="timed-node-timer inline-block" data-spawns="${node.spawns.join(',')}" data-duration="${node.duration || 60}" data-status="later">
             <span class="text-slate-500 dark:text-slate-400 text-xs">${label}</span>
        </div>`;
    }

    const spawnTimeStr = node.spawns.map(h => `${String(h).padStart(2, '0')}:00`).join('/');
    
    // Location Text with Clickable Map
    const coordsText = (node.x && node.y) ? `(X:${node.x}, Y:${node.y})` : '';
    // If mapName is empty or Place#0, use localized "Unknown Location"
    let mapDisplay = node.mapName;
    if (!mapDisplay || mapDisplay.includes('#0') || mapDisplay.includes('#undefined')) {
        mapDisplay = t('unknown_location');
    }

    const locHtml = `
        <span class="text-slate-500 dark:text-slate-400">
            📍 ${mapDisplay} 
            ${(node.map && node.map !== 0 && node.x && node.y) ? `<button onclick="showMapModal(${node.map}, ${node.x}, ${node.y}, '${node.itemName.replace(/'/g, "\\'")}', event)" class="text-xs ml-1 opacity-75 hover:opacity-100 hover:text-blue-500 cursor-pointer transition-colors font-mono">${coordsText}</button>` : (coordsText ? `<span class="text-xs ml-1 opacity-50 font-mono">${coordsText}</span>` : '')}
        </span>
    `;

    // Type Icon
    const typeIcons = { 1: 'mining', 2: 'quarrying', 3: 'logging', 4: 'harvesting' };
    const typeKey = typeIcons[node.type] || 'mining';
    const typeIconUrl = UI_ICONS[typeKey];
    const typeHtml = typeIconUrl ? `<img src="${typeIconUrl}" class="w-3 h-3 opacity-50">` : '';

    return `
        <div class="group bg-slate-50 dark:bg-slate-700/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors ${isChecked ? 'opacity-50' : ''} relative overflow-hidden">
            <!-- No Background Progress Bar -->
            
            <div class="flex items-start gap-3">
                 <!-- Main Checkbox -->
                 <div class="mt-1 shrink-0">
                    <input type="checkbox" 
                        class="custom-checkbox w-5 h-5 cursor-pointer text-slate-800 dark:text-slate-200"
                        ${isChecked ? 'checked' : ''} 
                        onchange="toggleItem('${node.itemId}')">
                 </div>
                 
                 <div class="flex-grow min-w-0">
                    <div class="flex items-start gap-3">
                        <img src="${iconUrl}" class="w-10 h-10 rounded border border-slate-300 dark:border-slate-600 shadow-sm bg-slate-800 shrink-0" loading="lazy" onerror="this.src='https://xivapi.com/i/066000/066313_hr1.png'">
                        
                        <div class="flex-grow min-w-0">
                             <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-bold text-slate-800 dark:text-slate-100 text-base truncate">${node.itemName}</span>
                                <button onclick="copyToClipboard('${node.itemName.replace(/'/g, "\\'")}', event)" class="text-slate-400 hover:text-blue-500 transition-colors" title="Copy Name">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                                <button onclick="toggleBookmark('${node.itemId}', event)" class="${isBookmarked ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'} transition-colors ml-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                </button>
                             </div>
                             
                             <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                ${typeHtml}
                                <span>Lv.${node.level}</span>
                                <span class="text-slate-300 dark:text-slate-600">|</span>
                                ${locHtml}
                             </div>
                             
                             <div class="text-xs mt-1.5 flex items-center gap-2">
                                <span class="font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 shrink-0">⏰ ${spawnTimeStr}</span>
                             </div>
                             
                             <div class="mt-1">
                                ${timerHtml}
                             </div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    `;
}

function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-offset')) || 150;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset - 10;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });

        element.classList.add('ring-2', 'ring-yellow-500');
        setTimeout(() => element.classList.remove('ring-2', 'ring-yellow-500'), 1000);
    }
}

function setRegion(regionId) {
    currentRegion = regionId;
    render();
}

function toggleHideCompleted() {
    gHideCompleted = !gHideCompleted;
    render();
}

// Setup Sticky Observer
// Update Sticky Offsets

// Update Sticky Offsets
// Update Sticky Offsets
function updateStickyOffsets() {
    const headerEl = document.getElementById('main-nav');
    const headerHeight = headerEl ? headerEl.offsetHeight : 0;
    
    document.documentElement.style.setProperty('--header-offset', `${headerHeight}px`);
    document.documentElement.style.setProperty('--nav-height', `${headerHeight}px`);
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);

    // Handle Sticky State using Sentinel for stability
    const navContainer = document.getElementById('level-nav-container');
    const sentinel = document.getElementById('sticky-sentinel');

    if (navContainer && sentinel) {
        const sentinelRect = sentinel.getBoundingClientRect();
        // Trigger when sentinel slides under the header
        // Use a small buffer (1px) to ensure smooth snap
        const isStuck = sentinelRect.top <= (headerHeight + 1);

        if (isStuck) {
            navContainer.classList.add('is-pinned');
        } else {
            navContainer.classList.remove('is-pinned');
        }
    }
}

// Drag to Scroll Logic for Level Grid (with Momentum/Inertia)
function enableDragScroll(el) {
    if (!el) return;
    
    let isDown = false;
    let startX;
    let scrollLeft;
    let velX = 0;
    let momentumID;

    const cancelMomentum = () => {
        cancelAnimationFrame(momentumID);
    };

    el.addEventListener('mousedown', (e) => {
        isDown = true;
        el.style.cursor = 'grabbing';
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        
        // Stop any existing momentum
        cancelMomentum();
    });

    el.addEventListener('mouseleave', () => {
        isDown = false;
        el.style.removeProperty('cursor');
        
        // Trigger momentum on leave if we were dragging
        beginMomentum();
    });

    el.addEventListener('mouseup', () => {
        isDown = false;
        el.style.removeProperty('cursor');
        
        // Trigger momentum
        beginMomentum();
    });

    el.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        
        // Calculate velocity (difference since last move) in a simple way
        // Ideally we track time, but simple delta works for mouse
        const prevScrollLeft = el.scrollLeft;
        el.scrollLeft = scrollLeft - walk;
        
        // Update velocity: Current - Previous
        // Note: we want the direction. 
        // If we moved right (scroll decreases), velocity is negative?
        // Wait, scrollLeft = initial - walk. 
        // If we drag left (x < startX), walk is negative, scrollLeft increases.
        // We want velocity to be the change in scrollLeft.
        velX = el.scrollLeft - prevScrollLeft; 
    });
    
    // Momentum Loop
    function beginMomentum() {
        cancelMomentum();
        
        const loop = () => {
            // Apply Friction
            velX *= 0.95; 
            
            if (Math.abs(velX) > 0.5) {
                el.scrollLeft += velX;
                momentumID = requestAnimationFrame(loop);
            }
        };
        
        loop();
    }
    
    // Wheel event should stop momentum?
    el.addEventListener('wheel', cancelMomentum);
}


function updateSidebar(availableZones) {
    if (availableZones) gLastAvailableZones = availableZones;
    else availableZones = gLastAvailableZones;

    if (!availableZones) return;

    const list = document.getElementById('region-list');
    list.innerHTML = '';

    // availableZones is Set of "regionId-mapPlaceId" strings
    // Group by RegionID
    const regions = {}; // key: regionId, val: Set of mapPlaceIds
    
    availableZones.forEach(str => {
        const [rid, pid] = str.split('-');
        if (!regions[rid]) regions[rid] = new Set();
        regions[rid].add(Number(pid));
    });

    // Sort Regions (Broader)
    const sortedRegionIds = Object.keys(regions).sort((a,b) => a - b);
    
    // Group by Expansion
    const expGroups = {};
    sortedRegionIds.forEach(rid => {
        const expKey = EXPANSION_MAP[rid] || 'others';
        if (!expGroups[expKey]) expGroups[expKey] = [];
        expGroups[expKey].push(rid);
    });

    // Expansion Order
    const expOrder = ['exp_2', 'exp_3', 'exp_4', 'exp_5', 'exp_6', 'exp_7', 'others'];
    
    // Wiki Colors (Huiji) - Verified
    const EXPANSION_COLORS = {
        'exp_2': '#666666', // ARR Grey/Standard
        'exp_3': '#4C7EE8', // HW Blue
        'exp_4': '#A22A3E', // SB Red
        'exp_5': '#2E1D4A', // ShB Purple
        'exp_6': '#3D4E99', // EW Blue/Gradient
        'exp_7': '#9B853F', // DT Gold/Gradient
        'others': '#64748b' // Slate-500
    };

    // Add 'All' button
    const allBtn = document.createElement('button');
    allBtn.className = `w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors mb-2 ${currentRegion === 'all' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-800' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`;
    allBtn.innerText = t('all_regions');
    allBtn.onclick = () => setRegion('all');
    list.appendChild(allBtn);

    expOrder.forEach(expKey => {
        const regionIds = expGroups[expKey];
        if (!regionIds || regionIds.length === 0) return;

        // Expansion Header
        const color = EXPANSION_COLORS[expKey] || EXPANSION_COLORS['others'];
        
        if (expKey !== 'others') {
            const isCollapsed = gCollapsedExpansions.has(expKey);
            
            const expHeader = document.createElement('div');
            expHeader.className = "text-xs font-extrabold mt-6 mb-2 px-3 py-1.5 rounded shadow-sm flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all select-none";
            expHeader.style.backgroundColor = color;
            expHeader.style.color = '#ffffff'; 
            
            expHeader.onclick = () => {
                if (gCollapsedExpansions.has(expKey)) gCollapsedExpansions.delete(expKey);
                else gCollapsedExpansions.add(expKey);
                updateSidebar(); 
            };

            // SVG Icons (White via currentColor) preventing Blue Emoji issues
            // ViewBox 0 0 24 24
            const iconSvg = isCollapsed 
                // Right Triangle
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M8 5v14l11-7z"/></svg>`
                // Down Triangle
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M12 17l-7-9h14z"/></svg>`; // M5 8h14l-7 9z ? Check path.
                // Standard Down: M7 10l5 5 5-5z for chevron. 
                // M5.25 8l6.75 8 6.75-8h-13.5z?
                // Let's use simple paths. M7 10 l5 5 l5 -5 z (Chevron style, or Triangle?)
                // User had Triangle before. 
                // Down Triangle: M7 10l5 5 5-5H7z ? No, that's top-flat.
                // Re-verify triangle paths.
                
            // Use safe Triangle Paths
            const rightPath = "M8 5v14l11-7z"; 
            const downPath = "M7 10l5 5 5-5z"; // Chevron-ish or Triangle?
            // Solid Triangle Down: M5 8h14l-7 12z (Roughly)
            // Let's use Heroicons solid
            const downPoly = "M4.5 9h15l-7.5 9z"; // Simple triangle pointing down

            // Final SVG
            const safeIcon = isCollapsed
                ? `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>` // Right
                : `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 8h14l-7 10z"/></svg>`; // Down

            expHeader.innerHTML = `${safeIcon} <span>${t(expKey)}</span>`;
            
            list.appendChild(expHeader);

            if (isCollapsed) return; // Skip rendering children if collapsed
        } else if (regionIds.length > 0) {
            // Optional header for Others
            const otherHeader = document.createElement('div');
            otherHeader.className = "text-xs font-extrabold text-slate-500 mt-6 mb-2 px-2 border-b border-slate-200 dark:border-slate-700 pb-1";
            otherHeader.innerText = t('others');
            list.appendChild(otherHeader);
        }

        regionIds.forEach(rid => {
            const rName = t(rid, 'place');
            const displayRName = (rName && rName !== '？？？？' && rName !== '???') ? rName : t('others');
            
            // Region Sub-Header
            const header = document.createElement('div');
            header.className = "text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-3 mb-1 px-2";
            header.innerText = displayRName;
            list.appendChild(header);

            // Map Buttons
            const mapIds = Array.from(regions[rid]).sort((a,b) => a - b);
            
            mapIds.forEach(mid => {
                const mName = t(mid, 'place');
                if (!mName) return;

                const btn = document.createElement('button');
                const isActive = currentRegion === String(mid);
                
                // Use Colored active state?
                const activeStyle = isActive 
                    ? `background-color: ${color}20; color: ${color}; font-weight: bold;` 
                    : '';
                
                btn.className = `w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors truncate mb-0.5 ${isActive ? '' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`;
                if (isActive) btn.style.cssText = activeStyle;
                
                btn.innerHTML = `<span class="mr-1 opacity-50">•</span> ${mName}`;
                btn.onclick = () => setRegion(String(mid));
                list.appendChild(btn);
            });
        });
    });
}

function getLocationHtml(itemId) {
    const nodes = gItemNodes[itemId];
    if (!nodes || nodes.length === 0) return '';

    // De-duplicate: Group by Map (Region) + Zone
    const uniqueLocs = {}; // Key: "MapId-ZoneId"

    nodes.forEach(n => {
        const key = `${n.mapPlaceId}-${n.zoneid}`;
        if (!uniqueLocs[key]) {
            uniqueLocs[key] = {
                mapPlaceId: n.mapPlaceId,
                zoneid: n.zoneid,
                coords: []
            };
        }
        if (n.x && n.y) uniqueLocs[key].coords.push({ x: n.x, y: n.y });
    });

    let html = '';
    const isCrystal = (Number(itemId) >= 2 && Number(itemId) <= 19);
    
    // Sort locations by level? Or just pick first 4?
    // User requested "lowest level first 4".
    // We need to know the level of the node.
    let locsArray = Object.values(uniqueLocs);
    
    if (isCrystal) {
        // Find min level per location to sort
        locsArray.forEach(loc => {
            // Find nodes for this location to get min level
            const locNodes = nodes.filter(n => n.mapPlaceId === loc.mapPlaceId && n.zoneid === loc.zoneid);
            loc.minLevel = Math.min(...locNodes.map(n => n.level));
        });
        
        // Sort by level asc
        locsArray.sort((a, b) => a.minLevel - b.minLevel);
        
        const originalLength = locsArray.length;
        if (originalLength > 4) {
             locsArray = locsArray.slice(0, 4);
             // We will append a notice later
             var truncated = true;
        }
    }

    for (const loc of locsArray) {
        const parentName = t(loc.mapPlaceId, 'place');
        const specificName = t(loc.zoneid, 'place');
        
        const displayName = (parentName === specificName || !specificName) ? parentName : `${parentName} - ${specificName}`;

        const coordStr = loc.coords.length > 0 
            ? `(X:${loc.coords[0].x.toFixed(1)}, Y:${loc.coords[0].y.toFixed(1)})` 
            : '';
        
        // Add level info for Debug/Clarity? Maybe not needed, just implied low level.
        
        html += `<div class="flex items-center text-[11px] text-slate-600 dark:text-slate-400">
            <span class="mr-1">📍</span>
            <span class="font-medium hover:text-blue-500 transition-colors">${displayName}</span>
            <span class="ml-1 opacity-75 font-mono text-[10px]">${coordStr}</span>
        </div>`;
    }
    
    if (isCrystal && typeof truncated !== 'undefined' && truncated) {
        html += `<div class="text-[10px] italic text-slate-400 pl-4">... ${t('ui_omitted', 'ui') || '(others omitted)'}</div>`;
    }

    return html;
}

// Copy to Clipboard Utility
function copyToClipboard(text, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault(); // Prevent default button behavior
    }
    
    // Fallback for older browsers or if navigator.clipboard is blocked
    // But for a local tool, we assume modern browser env.
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`${t('copied')}: ${text}`);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback?
        });
    } else {
        // Simple fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(`${t('copied')}: ${text}`);
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    }
}

// Simple Toast Notification
function showToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg z-50 transform transition-all duration-300 translate-y-20 opacity-0';
        document.body.appendChild(toast);
    }
    
    toast.innerText = message;
    
    // Show
    // Force reflow
    void toast.offsetWidth;
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    // Hide after 2s
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 2000);
}

// --- Map Modal Functions ---
function showMapModal(mapId, x, y, itemName, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const map = gMaps[mapId];
    if (!map) {
        console.warn('Map not found:', mapId);
        return;
    }
    
    const modal = document.getElementById('map-modal');
    const title = document.getElementById('map-modal-title');
    const image = document.getElementById('map-modal-image');
    const marker = document.getElementById('map-modal-marker');
    const coords = document.getElementById('map-modal-coords');
    
    // Set title
    const mapName = t(map.placename_id || mapId, 'place');
    title.innerText = itemName ? `${itemName} - ${mapName}` : mapName;
    
    // Set map image
    image.src = map.image || `https://xivapi.com/m/${map.id}/${map.id}.00.jpg`;
    
    // Calculate pixel position from game coordinates
    // FFXIV map coordinate formula:
    // sizeFactor is 100 for most maps, but can vary
    const sizeFactor = map.size_factor || 100;
    const c = sizeFactor / 100;
    
    // Convert game coords (typically 1-42 range) to percentage (0-100%)
    // The formula: ((coord - 1) * c / 41 + 1) / 42 * 100
    const pixelX = ((x - 1) * c / 41 + 1) / 42 * 100;
    const pixelY = ((y - 1) * c / 41 + 1) / 42 * 100;
    
    // Apply to marker
    marker.style.left = `${pixelX}%`;
    marker.style.top = `${pixelY}%`;
    
    // Set coords text
    coords.innerText = `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)}`;
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeMapModal(event) {
    // If clicking on backdrop (not the modal content), close
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('map-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('map-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeMapModal();
        }
    }
});

// --- Eorzea Time Clock ---
const EORZEA_MULTIPLIER = 3600 / 175;

function getEorzeaTime() {
  // Calculate how many milliseconds have elapsed since 1/1/1970
  const epoch = new Date().getTime();
  // Multiply by the Eorzea multiplier
  const eorzeaMilliseconds = epoch * EORZEA_MULTIPLIER;
  
  // Create a new Date object for Eorzea time
  return new Date(eorzeaMilliseconds);
}

function updateClock() {
    const etDate = getEorzeaTime();
    const hours = etDate.getUTCHours().toString().padStart(2, '0');
    const minutes = etDate.getUTCMinutes().toString().padStart(2, '0');
    
    const clockElement = document.getElementById('et-clock');
    if (clockElement) {
        clockElement.innerText = `ET ${hours}:${minutes}`;
    }

    updateTimers(etDate);
}


function updateTimers(etDate) {
    const timers = document.querySelectorAll('.timed-node-timer');
    if (timers.length === 0) return;

    // We need precise Real Time targets to tick every second.
    // 1. Get current Real Time
    const nowReal = new Date().getTime();
    
    // 2. Constants
    // ET_Millis = Real_Millis * (3600 / 175)
    // Real_Millis = ET_Millis * (175 / 3600)
    const REAL_TO_ET_MULT = 3600 / 175;
    const ET_TO_REAL_MULT = 175 / 3600;

    // Current ET precise (millis)
    const currentEtMillis = nowReal * REAL_TO_ET_MULT;
    
    // We need current ET Date to determine Day/Hour context
    const currentEtDate = new Date(currentEtMillis);
    const currentEth = currentEtDate.getUTCHours();
    const currentEtm = currentEtDate.getUTCMinutes();
    const currentEtTotalMin = currentEth * 60 + currentEtm;

    let needsRefresh = false;

    timers.forEach(timer => {
        const spawns = timer.dataset.spawns.split(',').map(Number);
        const durationMin = parseInt(timer.dataset.duration) || 60; // Eorzea Minutes
        const oldStatus = timer.dataset.status; 

        // Find state
        let activeSpawn = -1;
        
        // 1. Check if ACTIVE
        // We use minute-based logic for State Determination (Active/Waiting)
        // because "Active" is defined by ET Hours range.
        for (const spawnHour of spawns) {
            const spawnMin = spawnHour * 60;
            let diff = currentEtTotalMin - spawnMin;
            if (diff < 0) diff += 1440; 
            if (diff >= 0 && diff < durationMin) {
                activeSpawn = spawnHour;
                break;
            }
        }
        
        let currentStatus = 'later';
        let targetEtMillis = 0;
        let isComing = false;

        if (activeSpawn !== -1) {
            currentStatus = 'active';
            
            // Calculate Expiry Time (Real Precision)
            // Target ET = Current ET Day Base + Spawn Time + Duration
            // We need to be careful about Day boundaries in milliseconds.
            
            // Current ET Start of Day (00:00)
            const etDayStartMillis = currentEtMillis - (currentEth * 3600000 + currentEtm * 60000 + currentEtDate.getUTCSeconds() * 1000 + currentEtDate.getUTCMilliseconds());
            
            // Target: Spawn Time
            let targetSpawnMillis = etDayStartMillis + (activeSpawn * 3600000);
            
            // If activeSpawn > currentEth (wrap case implies we came from previous day?), 
            // wait, if we are inside the window, activeSpawn is "start time".
            // If current is 01:00 and spawn was 23:00 (active), then targetSpawnMillis should be yesterday?
            
            // Re-eval using simple difference
            const spawnMin = activeSpawn * 60;
            let offsetMinFromSpawn = currentEtTotalMin - spawnMin;
            if (offsetMinFromSpawn < 0) offsetMinFromSpawn += 1440;
            
            // Target Expiry is (Duration - Offset) minutes away from NOW (approx).
            // Precise: Target ET = Current ET + (Duration - Offset) * 60000 ? No that steps.
            
            // Better: Target ET = (Spawn + Duration).
            // If we are Active, the Spawn Time (start) is strictly in the past (or now).
            // Expiry = Spawn + Duration.
            
            // Identify correct "Spawn Start Timestamp"
            // If current is 01:00, Spawn 23:00. This means Spawn was Yesterday.
            // If current is 10:00, Spawn 09:00. Spawn was Today.
            
            let rotation = 0; // days offset
            if (activeSpawn > currentEth && (activeSpawn - currentEth > 12)) {
                // e.g. Now 01, Spawn 23. offset -1 day.
                rotation = -1;
            }
            
            const etYear = currentEtDate.getUTCFullYear();
            const etMonth = currentEtDate.getUTCMonth();
            const etDay = currentEtDate.getUTCDate();
            
            // Construct base date for Today 00:00 ET
            const baseEtDate = new Date(Date.UTC(etYear, etMonth, etDay + rotation, activeSpawn, 0, 0));
            // Add duration
            const expiryEtDate = new Date(baseEtDate.getTime() + (durationMin * 60000));
            
            targetEtMillis = expiryEtDate.getTime();

        } else {
            // Waiting
            // Find closest NEXT spawn
            let bestDist = Infinity;
            let nextSpawn = -1;
            
            for (const spawnHour of spawns) {
                const spawnMin = spawnHour * 60;
                let dist = spawnMin - currentEtTotalMin;
                if (dist <= 0) dist += 1440; 
                
                if (dist < bestDist) {
                    bestDist = dist;
                    nextSpawn = spawnHour;
                }
            }
            
            // Determine Target Timestamp for Start
            let rotations = 0; // 0 = today, 1 = tomorrow
            
            // If nextSpawn < currentEth, it must be tomorrow
            // e.g. Now 23, Next 01 -> Tomorrow.
            // e.g. Now 10, Next 12 -> Today.
            if (nextSpawn < currentEth || (nextSpawn === currentEth && currentEtm > 0)) {
                rotations = 1;
            }
            
            const etYear = currentEtDate.getUTCFullYear();
            const etMonth = currentEtDate.getUTCMonth();
            const etDay = currentEtDate.getUTCDate();
            
            const targetSpawnDate = new Date(Date.UTC(etYear, etMonth, etDay + rotations, nextSpawn, 0, 0));
            targetEtMillis = targetSpawnDate.getTime();
            
            // Check if soon
            // Rough check using bestDist first
            const approxRealSec = bestDist * (70 * 60 / 1440);
            if (approxRealSec <= (20 * 60)) {
                currentStatus = 'soon';
            }
        }

        // --- CHECK STATE CHANGE ---
        if (oldStatus !== currentStatus) {
            if (oldStatus === 'active' || currentStatus === 'active') {
                needsRefresh = true;
            }
            timer.dataset.status = currentStatus;
        }

        // --- RENDER COUNTDOWN ---
        // Convert Target ET Millis -> Real Millis
        // Real_Target = Target_ET * ET_TO_REAL_MULT
        const targetRealMillis = targetEtMillis * ET_TO_REAL_MULT;
        
        // Diff
        let diffRealSec = (targetRealMillis - nowReal) / 1000;
        if (diffRealSec < 0) diffRealSec = 0; // Clamp
        
        const m = Math.floor(diffRealSec / 60);
        const s = Math.floor(diffRealSec % 60);

        if (currentStatus === 'active') {
            // Need total duration in Real Sec for Progress Bar
            // Duration ET min -> Real Sec
            const totalDurationRealSec = durationMin * (70 * 60 / 1440); 
            const elapsedRealSec = totalDurationRealSec - diffRealSec;
            const percent = Math.min(100, Math.max(0, (elapsedRealSec / totalDurationRealSec) * 100));

            timer.innerHTML = `
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 relative overflow-hidden mt-1 ring-1 ring-green-500/30">
                    <div class="bg-green-500 h-full transition-all duration-1000 linear" style="width: ${100 - percent}%"></div>
                    <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-100 drop-shadow-sm shadow-black">
                        Active! ${m}m ${s}s
                    </span>
                </div>
            `;
        } else if (currentStatus === 'soon') {
            timer.innerHTML = `
               <span class="text-amber-600 dark:text-amber-400 text-sm font-bold">
                   in ${m}m ${s}s
               </span>
            `;
        } else {
             // Later
             const totalMinutes = diffRealSec / 60;
             if (totalMinutes > 60) {
                 const h = (totalMinutes / 60).toFixed(1);
                 timer.innerHTML = `<span class="text-slate-500 dark:text-slate-400 text-xs">in ${h}h</span>`;
             } else {
                 const mm = Math.ceil(totalMinutes);
                 timer.innerHTML = `<span class="text-slate-500 dark:text-slate-400 text-xs">in ${mm}m</span>`;
             }
        }
    });

    if (needsRefresh && currentViewMode === 'timed') {
        renderTimedView();
    }
}

// Update clock every second (real-time) which is plenty for HH:MM
// --- Sticky Header Logic ---
// --- Sticky Header Logic ---
let lastNavHeight = -1;
let lastHeaderOffset = -1;
let isAnimating = false; // Block updates during animation

function updateStickyOffsets() {
    if (isAnimating) return; // Skip updates during animation to prevent thrashing

    const mainNav = document.getElementById('main-nav');
    const levelNav = document.getElementById('level-nav-container');
    
    if (!mainNav || !levelNav) return;
    
    const navHeight = mainNav.offsetHeight;
    const levelNavHeight = levelNav.offsetHeight;
    const headerOffset = navHeight + levelNavHeight;
    
    // Only update if values changed significantly (debounce small sub-pixel layout shifts)
    if (Math.abs(navHeight - lastNavHeight) > 1 || Math.abs(headerOffset - lastHeaderOffset) > 1) {
        lastNavHeight = navHeight;
        lastHeaderOffset = headerOffset;
        
        window.requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
            document.documentElement.style.setProperty('--header-offset', `${headerOffset}px`);
            setupStickyObserver(); // Refresh observer with new margins
        });
    }
}

// Observe size changes
const stickyResizeObserver = new ResizeObserver(() => updateStickyOffsets());
const mainNavEl = document.getElementById('main-nav');
const levelNavEl = document.getElementById('level-nav-container');
if (mainNavEl) stickyResizeObserver.observe(mainNavEl);
if (levelNavEl) stickyResizeObserver.observe(levelNavEl);


// Use IntersectionObserver for pinning (No Scroll Event!)
let stickyIO = null;

function setupStickyObserver() {
    const sentinel = document.getElementById('sticky-sentinel');
    const mainNav = document.getElementById('main-nav');
    const levelNav = document.getElementById('level-nav-container');
    
    if (!sentinel || !mainNav || !levelNav) return;
    
    if (stickyIO) stickyIO.disconnect();

    const navHeight = mainNav.offsetHeight;
    
    const thresholdBuffer = 320; // Require 300px extra scroll before folding
    
    // Move sentinel down physically to create the buffer
    sentinel.style.top = `${thresholdBuffer}px`;

    stickyIO = new IntersectionObserver(([e]) => {
        // 1. Block Re-entry during animation to swallow layout-shift events
        if (isAnimating) return;
        
        // Check simply: Is the sentinel (now at +300px) intersecting?
        // If it's NOT intersecting, and it's ABOVE the nav (top < navHeight), then we scrolled down past 300px.
        const shouldPin = !e.isIntersecting && e.boundingClientRect.top < navHeight;
        const currentlyPinned = levelNav.classList.contains('is-pinned');
        
        if (shouldPin !== currentlyPinned) {
            // LOCK UPDATES START
            isAnimating = true; 
            
            if (shouldPin) {
                 // Pinning
                 document.body.classList.add('no-sticky'); // Disable sticky temporarily
                 
                 // Enforce min-height
                 const contentArea = document.getElementById('content-area');
                 if(contentArea) contentArea.style.minHeight = '150vh';
                 
                 levelNav.classList.add('is-pinned');
            } else {
                 // Unpinning
                 document.body.classList.add('no-sticky'); // Disable sticky temporarily
                 
                 levelNav.classList.remove('is-pinned');
            }
            
            // UNLOCK AFTER TRANSITION
            setTimeout(() => {
                isAnimating = false;
                document.body.classList.remove('no-sticky'); // Re-enable sticky
                
                if (!shouldPin) {
                     const contentArea = document.getElementById('content-area');
                     if(contentArea) contentArea.style.minHeight = '';
                }
                
                // Force update offsets to correct position
                updateStickyOffsets(); 
            }, 500);
        }
        
    }, {
        root: null,
        threshold: [0], // Trigger as soon as 1 pixel leaves
        rootMargin: `-${navHeight}px 0px 0px 0px` // Standard check: is sentinel hidden under Main Nav?
    });
    
    stickyIO.observe(sentinel);
}



// Initial Call
updateStickyOffsets();
setupStickyObserver();

setInterval(updateClock, 1000);

function setupSidebarScrollLock() {
    const sidebar = document.getElementById('region-sidebar');
    if (!sidebar) return;

    sidebar.addEventListener('wheel', (e) => {
        const { scrollTop, scrollHeight, clientHeight } = sidebar;
        const delta = e.deltaY;
        const isScrollDown = delta > 0;
        const isScrollUp = delta < 0;

        // Prevent scroll propagation if at boundaries
        const atBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;
        const atTop = scrollTop <= 0;

        if ((isScrollDown && atBottom) || (isScrollUp && atTop)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false }); // Non-passive listener required to use preventDefault
}

// Initialize scroll lock
setupSidebarScrollLock();

init();
