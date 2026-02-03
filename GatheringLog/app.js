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
let gUiLocales = {}; // New container for UI text
let gCollapsedExpansions = new Set(); // Track collapsed specific expansion sections
let gLastAvailableZones = null; // Store for re-rendering sidebar
let gHideCompleted = false;

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
        gUiLocales = await uiRes.json(); // Load UI locales

        processNodes();
        updateLangButtons();
        render();
        
        // Setup sticky header
        setTimeout(updateStickyOffsets, 100);
        window.addEventListener('resize', updateStickyOffsets);
        window.addEventListener('scroll', updateStickyOffsets);

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
                mapPlaceId: info.placeId 
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

function t(id, type = 'ui') {
    if (type === 'ui') {
        const langData = gUiLocales[currentLang] || gUiLocales['en'];
        return (langData && langData[id]) || id;
    }
    
    if (type === 'item') {
        if (gItems[id]) {
            // Fallbacks: TW -> EN -> ID
            if (currentLang === 'zh-TW' && gItems[id].tw) return gItems[id].tw;
            if (gItems[id][currentLang]) return gItems[id][currentLang];
            if (gItems[id].en) return gItems[id].en;
        }
        return `Item #${id}`;
    }
    
    if (type === 'place') { 
            if (gPlaces[id]) {
            if (currentLang === 'zh-TW' && gPlaces[id].tw) return gPlaces[id].tw;
            if (gPlaces[id][currentLang]) return gPlaces[id][currentLang];
            if (gPlaces[id].en) return gPlaces[id].en;
            }
            return id;
    }

    return id;
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

function render() {
    // Update UI Labels
    document.getElementById('ui-title').innerText = t('title');
    document.getElementById('ui-progress').innerText = t('progress');
    document.getElementById('ui-jump-to').innerText = t('jump_to');
    document.getElementById('ui-hide-completed').innerText = t('hide_completed');
    document.getElementById('btn-miner').innerText = t('miner');
    document.getElementById('btn-botanist').innerText = t('botanist');
    updateJobButtons();

    // Setup Layout
    document.getElementById('region-sidebar').style.display = 'block'; 
    document.getElementById('region-sidebar').className = "w-full md:w-56 shrink-0 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 sticky top-24 max-h-[85vh] overflow-y-auto no-scrollbar shadow-lg z-40 transition-colors";
    document.getElementById('content-area').className = "flex-grow w-full min-w-0 relative";

    const listContainer = document.getElementById('list-container');
    const navGrid = document.getElementById('level-grid');
    listContainer.innerHTML = '';
    navGrid.innerHTML = '';

    // Determine Job Pages
    // 0: Miner, 1: Botanist, 2: Fisher (usually)
    const jobIndex = currentJob === 'miner' ? 0 : 1;
    const jobPages = gLogPages[jobIndex];

    if (!jobPages) {
        listContainer.innerHTML = '<div class="p-5 text-center col-span-full">No data found for this job.</div>';
        return;
    }

    // --- Collect Available Zones for Sidebar ---
    const availableZones = new Set();
    
    // --- Render Logic ---
    let totalItemsCount = 0;
    let totalCompletedCount = 0;

    jobPages.forEach(page => {
        // Page Grouping Logic
        const startLvl = page.startLevel;
        const pageId = page.id;
        const levelRange = `Lv. ${startLvl} - ${startLvl + 4}`;
        const sectionId = `section-${pageId}`;
        
        const itemsInPage = page.items;
        
        // Filter items by Region (and collect zones)
        const relevantItems = [];
        itemsInPage.forEach(itemEntry => {
            const itemId = String(itemEntry.itemId);
            const nodes = gItemNodes[itemId] || [];
            
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

            if (inRegion) {
                relevantItems.push(itemEntry);
            }
        });

        // Loop Logic
        // If currentRegion filters out all items in a page, we might still want to show the page header or just skip?
        // Let's skip empty sections if filtered
        if (relevantItems.length === 0) return;

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
        navBtn.innerHTML = `
            <span>Lv${startLvl}~${startLvl + 4}</span>
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

            visibleCount++;
            const itemName = t(itemId, 'item');
            
            const itemRow = document.createElement('div');
            itemRow.className = `group flex items-start p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ${isChecked ? 'checked-item bg-slate-50 dark:bg-slate-800/50' : ''}`;

            const iconUrl = getIconUrl(itemId);
            const iconHtml = `<img src="${iconUrl}" class="w-10 h-10 rounded mr-3 border border-slate-300 dark:border-slate-600 shadow-sm shrink-0 bg-slate-800" alt="" loading="lazy" onerror="this.src='https://xivapi.com/i/066000/066313_hr1.png'">`;
            
            // Location Html
            const locHtml = getLocationHtml(itemId);

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
                            ${item.stars ? `<span class="text-yellow-500 text-xs font-bold border border-yellow-500/30 px-1 rounded">★${item.stars}</span>` : ''}
                            ${item.hidden ? `<span class="text-red-400 text-xs border border-red-400/30 px-1 rounded">Hidden</span>` : ''}
                        </div>
                        <div class="mt-1 space-y-0.5">
                            ${locHtml}
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

        section.innerHTML = `
            <div class="section-header-sticky rounded-t-lg bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex justify-between items-center shadow-md transition-colors">
                <h2 class="font-bold text-slate-800 dark:text-slate-200">${levelRange}</h2>
                <span class="text-xs font-mono ${isAllDone ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}">
                    ${isAllDone ? t('done') : `${pCompleted}/${pTotal}`}
                </span>
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
    render();
}

function updateJobButtons() {
    const btnMiner = document.getElementById('btn-miner');
    const btnBotanist = document.getElementById('btn-botanist');
    const activeClass = "bg-blue-600 text-white ring-2 ring-blue-400 border-blue-500 shadow-lg shadow-blue-900/50";
    const inactiveClass = "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200";

    btnMiner.className = `flex-1 md:flex-none px-6 py-2 rounded-lg font-bold transition-all border ${currentJob === 'miner' ? activeClass : inactiveClass}`;
    btnBotanist.className = `flex-1 md:flex-none px-6 py-2 rounded-lg font-bold transition-all border ${currentJob === 'botanist' ? activeClass : inactiveClass}`;
}

function toggleItem(id) {
    if (completedItems.has(id)) completedItems.delete(id);
    else completedItems.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedItems]));
    render();
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

init();
