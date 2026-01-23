// Squadron UI Logic
// Handles DOM manipulation, events, and display updates

// --- Toast Notification Logic ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    // Styles based on type
    let borderColor = 'border-blue-500';
    let icon = 'ℹ️';

    if (type === 'success') {
        borderColor = 'border-green-500';
        icon = '✅';
    } else if (type === 'error') {
        borderColor = 'border-red-500';
        icon = '❌';
    }

    toast.className = `bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-3 rounded shadow-xl border-l-4 ${borderColor} flex items-center gap-3 transform transition-all duration-300 translate-y-2 opacity-0 min-w-[200px]`;
    toast.innerHTML = `
        <span class="text-lg">${icon}</span>
        <span class="text-sm font-medium">${message}</span>
    `;

    container.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // Auto Dismiss
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// --- Language Logic ---
let currentLang = localStorage.getItem('ffxiv-squadron-lang') || 'zh-TW';

window.changeLanguage = function (lang) {
    currentLang = lang;
    localStorage.setItem('ffxiv-squadron-lang', lang);
    updateLanguage();

    // Re-render roster to update names/jobs - REMOVED to prevent data loss
    // initRoster(); -> This wipes data. updateLanguage now handles in-place updates.
    // Re-calculate if results are shown to update result text
    if (document.getElementById('result-section').style.display === 'block') {
        calculate();
    }
}

window.updateLanguage = function () {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];

    // Update static elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerText = t[key];
    });

    // Update language buttons state
    document.querySelectorAll('[id^="lang-"]').forEach(btn => {
        if (btn.id === `lang-${currentLang.toLowerCase().replace('zh-', '')}`) {
            btn.classList.remove('opacity-50');
            btn.classList.add('opacity-100', 'font-bold', 'ring-1', 'ring-blue-500');

            // Re-update recruit names in inputs if language changes (simple refresh of values)
            for (let i = 0; i < 8; i++) {
                const input = document.getElementById(`name-${i}`);
                if (!input) continue;
                const initial = input.dataset.recruitId;
                if (initial && TRANSLATIONS[currentLang].recruit_names && TRANSLATIONS[currentLang].recruit_names[initial]) {
                    input.value = TRANSLATIONS[currentLang].recruit_names[initial];
                }

                // Update Class Text
                const clsInput = document.getElementById(`class-${i}`);
                const cls = clsInput.value;
                if (cls && TRANSLATIONS[currentLang].class_names) {
                    document.getElementById(`class-text-${i}`).innerText = TRANSLATIONS[currentLang].class_names[cls] || cls;
                }
                updateStatsDisplay(i); // Refresh stats labels
            }

        } else {
            btn.classList.add('opacity-50');
            btn.classList.remove('opacity-100', 'font-bold', 'ring-1', 'ring-blue-500');
        }
    });

    // Update inputs placeholder/title if needed
    document.querySelectorAll('input[id^="name-"]').forEach(input => {
        input.placeholder = t.placeholder_select || '選擇隊員...';
    });
}

// --- UI Logic ---
function updateRankCap() {
    const rank = parseInt(document.getElementById('rank-selector').value);
    const cap = RANK_CAPS[rank];
    document.getElementById('pool-cap-display').innerText = cap;
    validateSum();
}

function setInputs(p, m, t) {
    document.getElementById('curr-p').value = p;
    document.getElementById('curr-m').value = m;
    document.getElementById('curr-t').value = t;
}

function validateSum() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    const rank = parseInt(document.getElementById('rank-selector').value);
    const cap = RANK_CAPS[rank];
    const p = parseInt(document.getElementById('curr-p').value) || 0;
    const m = parseInt(document.getElementById('curr-m').value) || 0;
    const tVal = parseInt(document.getElementById('curr-t').value) || 0;
    const sum = p + m + tVal;
    document.getElementById('current-sum-display').innerText = sum;
    const warning = document.getElementById('sum-warning');
    if (sum !== cap) {
        warning.style.display = 'block';
        // 使用翻譯文字 + 數值顯示，確保多語言相容
        warning.innerText = t.sum_warning + ` (${sum}/${cap})`;
        return false;
    } else {
        warning.style.display = 'none';
        return true;
    }
}

// --- Roster Initialization ---
const rosterContainer = document.getElementById('roster-container');
const defaultRecruits = [];

// Save/Load Logic
const CLASS_MAP_EXPORT = {
    'GLA': 'gladiator', 'MRD': 'marauder', 'CNJ': 'conjurer',
    'THM': 'thaumaturge', 'ACN': 'arcanist', 'LNC': 'lancer',
    'PGL': 'pugilist', 'ROG': 'rogue', 'ARC': 'archer'
};
const CLASS_MAP_IMPORT = Object.fromEntries(Object.entries(CLASS_MAP_EXPORT).map(([k, v]) => [v, k]));

// 從 Cap 反查 Rank（供匯入時使用）
function getRankByCap(cap) {
    return Object.entries(RANK_CAPS).find(([_, v]) => v === cap)?.[0];
}

function getSquadronDataObj() {
    const recruits = {};
    for (let i = 0; i < 8; i++) {
        const isActive = document.getElementById(`active-${i}`).checked;
        const nameInput = document.getElementById(`name-${i}`);
        const name = nameInput.dataset.recruitId || nameInput.value;
        const cls = document.getElementById(`class-${i}`).value;
        const lvl = parseInt(document.getElementById(`lvl-${i}`).value) || 1;
        const rData = RECRUIT_DATA.find(r => r.name === name) || {};

        recruits[(i + 1).toString()] = {
            "used": isActive,
            "class": CLASS_MAP_EXPORT[cls] || cls.toLowerCase(),
            "level": lvl,
            "race": (rData.race || "Unknown").toLowerCase(),
            "name": name,
            "exp": 0,
            "chemistry": ["none", 0, "none", false, 0] // Default placeholders as we don't track chemistry yet
        };
    }

    const currTrain = [
        parseInt(document.getElementById('curr-p').value) || 0,
        parseInt(document.getElementById('curr-m').value) || 0,
        parseInt(document.getElementById('curr-t').value) || 0
    ];

    const rankVal = parseInt(document.getElementById('rank-selector').value);
    const rankCap = RANK_CAPS[rankVal] || 400;

    return {
        "recruits": recruits,
        "training": currTrain,
        "rank": rankCap
    };
}

function saveSquadronData() {
    const data = getSquadronDataObj();
    const jsonStr = JSON.stringify(data);
    localStorage.setItem('ffxiv_squad_data', jsonStr);
    showToast(TRANSLATIONS[currentLang]?.msg_saved || "Squadron data saved!", "success");
    // console.log("Saved JSON:", jsonStr);
}

// Export/Import Modal Logic
function openExportModal() {
    const data = getSquadronDataObj();
    const jsonStr = JSON.stringify(data); // Minified JSON
    document.getElementById('data-textarea').value = jsonStr;
    document.getElementById('data-textarea').readOnly = true;

    document.getElementById('export-actions').classList.remove('hidden');
    document.getElementById('import-actions').classList.add('hidden');

    document.getElementById('data-modal').style.display = 'flex';
}

function openImportModal() {
    document.getElementById('data-textarea').value = '';
    document.getElementById('data-textarea').readOnly = false;

    document.getElementById('export-actions').classList.add('hidden');
    document.getElementById('import-actions').classList.remove('hidden');

    document.getElementById('data-modal').style.display = 'flex';
    document.getElementById('data-textarea').focus();
}

function closeDataModal() {
    document.getElementById('data-modal').style.display = 'none';
}

function copyToClipboard() {
    const textarea = document.getElementById('data-textarea');
    textarea.select();
    document.execCommand('copy'); // Legacy but reliable, or use navigator.clipboard

    const btn = document.querySelector('#export-actions button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>✅</span> Copied!';
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 2000);
}

function processImport() {
    const jsonStr = document.getElementById('data-textarea').value;
    try {
        const data = JSON.parse(jsonStr);

        loadSquadronData(false, data);
        saveSquadronData(); // 匯入後自動儲存至本機
        closeDataModal();
    } catch (e) {
        showToast("Invalid JSON format!", "error");
        console.error(e);
    }
}

function loadSquadronData(silent = false, dataObj = null) {
    let data = dataObj;

    if (!data) {
        const jsonStr = localStorage.getItem('ffxiv_squad_data');
        if (!jsonStr) {
            if (!silent) console.log("No saved data found.");
            if (!silent) showToast("No saved data found.", "info");
            return;
        }
        try {
            data = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse saved data:", e);
            if (!silent) showToast("Failed to load saved data", "error");
            return;
        }
    }

    try {
        console.log("Loading data:", data);

        // Load Rank
        const importedRank = getRankByCap(data.rank);
        if (data.rank && importedRank) {
            document.getElementById('rank-selector').value = importedRank;
            updateRankCap();
        }

        // Load Training
        if (data.training && Array.isArray(data.training) && data.training.length >= 3) {
            setInputs(data.training[0], data.training[1], data.training[2]);
            validateSum();
        }

        // Load Recruits
        if (data.recruits) {
            for (let i = 0; i < 8; i++) {
                const rec = data.recruits[(i + 1).toString()];
                if (rec) {
                    // Name & Img selector logic
                    const name = rec.name;
                    const rData = RECRUIT_DATA.find(r => r.name === name); // Try exact match first

                    // Emulate selection
                    const nameInput = document.getElementById(`name-${i}`);
                    if (nameInput) {
                        nameInput.value = (TRANSLATIONS[currentLang]?.recruit_names?.[name]) || name;
                        nameInput.setAttribute('data-recruit-id', name);

                        // Update Image
                        if (rData) {
                            const headerDiv = nameInput.parentElement.previousElementSibling;
                            headerDiv.innerHTML = `<img src="${rData.img}" class="w-full h-full object-cover">`;
                        } else {
                            // Fallback for custom name or unknown
                            const headerDiv = nameInput.parentElement.previousElementSibling;
                            headerDiv.innerHTML = `<span id="initials-${i}" class="font-bold text-slate-500 dark:text-slate-300">${name.substring(0, 2)}</span>`;
                        }

                        // Class
                        const clsKey = CLASS_MAP_IMPORT[rec.class] || rec.class.toUpperCase(); // Fallback for direct matches
                        const clsInput = document.getElementById(`class-${i}`);
                        if (clsInput) {
                            clsInput.value = clsKey; // Update hidden input
                            // Update visual UI for class
                            document.getElementById(`class-icon-${i}`).src = CLASS_ICONS[clsKey] || '';
                            document.getElementById(`class-text-${i}`).innerText = (TRANSLATIONS[currentLang]?.class_names?.[clsKey]) || clsKey;
                        }

                        // Level
                        document.getElementById(`lvl-${i}`).value = rec.level;

                        // Active Status
                        const cb = document.getElementById(`active-${i}`);
                        cb.checked = rec.used;
                        toggleMember(i); // Update UI state
                        updateStatsDisplay(i); // Update stats
                    }
                }
            }
        }

        // Recalculate sum just in case
        validateSum();
        if (!silent) showToast(TRANSLATIONS[currentLang]?.msg_loaded || "Squadron data loaded!", "success");

    } catch (e) {
        console.error("Failed to load data:", e);
        if (!silent) showToast("Failed to load data", "error");
    }
}

function initRoster() {
    let html = '';
    for (let i = 0; i < 8; i++) {
        const def = defaultRecruits[i];
        const isDefined = !!def;

        const name = isDefined ? def.name : '';
        const cls = isDefined ? def.class : 'GLA';
        const lvl = isDefined ? def.level : 60;

        // Find data
        const rData = (isDefined && name) ? (RECRUIT_DATA.find(r => r.name === name) || { name: name, img: null, race: 'Unknown' }) : { name: '', img: null, race: 'Unknown' };

        html += `
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex flex-col gap-2 relative transition-all shadow-sm member-card ${!isDefined ? 'disabled' : ''}" id="card-${i}">
        <input type="checkbox" class="absolute top-2 right-2 w-5 h-5 cursor-pointer z-10 accent-blue-600 active-checkbox" id="active-${i}" ${isDefined ? 'checked' : ''} onchange="toggleMember(${i})">
        
        <div class="flex items-center gap-3 cursor-pointer p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors member-header" onclick="openRecruitModal(${i})" title="點擊更換隊員">
            <div class="w-20 h-28 bg-slate-200 dark:bg-slate-600 rounded-md flex justify-center items-center overflow-hidden shrink-0 shadow-sm border border-slate-300 dark:border-slate-500">
                ${rData.img ? `<img src="${rData.img}" class="w-full h-full object-cover">` : `<span id="initials-${i}" class="font-bold text-slate-500 dark:text-slate-300">${name.substring(0, 2)}</span>`}
            </div>
            <div class="flex-grow min-w-0">
                 <input type="text" id="name-${i}" value="${(isDefined && TRANSLATIONS[currentLang].recruit_names && TRANSLATIONS[currentLang].recruit_names[name]) || name}" data-recruit-id="${name}" readonly class="w-full bg-transparent border-none font-bold cursor-pointer text-slate-800 dark:text-slate-200 focus:ring-0 p-0 text-md truncate" placeholder="${TRANSLATIONS[currentLang].placeholder_select || '選擇隊員...'}">
            </div>
            <span class="text-xs text-slate-400">▼</span>
        </div>

        <div class="relative w-full" id="class-dd-container-${i}">
            <input type="hidden" id="class-${i}" value="${cls}">
            <button onclick="toggleClassDropdown(${i}, event)" id="class-btn-${i}" type="button" class="w-full p-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors" ${!isDefined ? 'disabled' : ''}>
                <div class="flex items-center gap-2 truncate">
                    <img src="${CLASS_ICONS[cls] || ''}" class="w-5 h-5 shrink-0" id="class-icon-${i}">
                    <span id="class-text-${i}" class="truncate">${(TRANSLATIONS[currentLang].class_names && TRANSLATIONS[currentLang].class_names[cls]) || cls}</span>
                </div>
                <span class="text-xs text-slate-400 shrink-0">▼</span>
            </button>
            <div id="class-dd-menu-${i}" class="hidden absolute top-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-xl z-20 max-h-60 overflow-y-auto mt-1">
                ${Object.keys(CLASS_LEVEL_STATS).map(k => `
                    <div onclick="selectClass(${i}, '${k}', event)" class="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <img src="${CLASS_ICONS[k] || ''}" class="w-5 h-5 shrink-0">
                        <span class="text-slate-900 dark:text-slate-100 text-sm truncate">${(TRANSLATIONS[currentLang].class_names && TRANSLATIONS[currentLang].class_names[k]) || k}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
            <label class="font-bold text-slate-600 dark:text-slate-400" data-i18n="lvl_label">Lv:</label>
            <input type="number" id="lvl-${i}" value="${lvl}" min="1" max="60" onchange="updateStatsDisplay(${i})" class="w-12 p-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100" ${!isDefined ? 'disabled' : ''}>
        </div>
        
        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1" id="stats-display-${i}" style="${!isDefined ? 'opacity: 0.5;' : ''}">P:0 M:0 T:0</div>
    </div>
    `;
    }
    rosterContainer.innerHTML = html;

    // Post-render: Apply disabled state properly visually
    for (let i = 0; i < 8; i++) {
        // If not defined, card is disabled, let's ensure inputs are disabled (already set in HTML mostly)
        // But toggleMember logic might need to run to ensure everything is consistent
        toggleMember(i);
        updateStatsDisplay(i);
    }
    validateSum();
}

// Modal Logic
let currentSlotIndex = -1;
let isListMode = false;

function openRecruitList() {
    isListMode = true;
    openRecruitModal(-1);
}

function openRecruitModal(index) {
    // console.log("Opening modal for slot:", index);

    if (index !== -1) {
        isListMode = false;
        currentSlotIndex = index;
    } else {
        currentSlotIndex = -1; // List Mode
    }

    const modal = document.getElementById('recruit-modal');
    const modalContent = modal.firstElementChild; // The inner div with classes
    const container = document.getElementById('recruit-list-container');
    const modalTitle = modal.querySelector('h3');

    if (!modal || !container) {
        console.error("Modal or Container element not found!");
        return;
    }

    // UI State Classes
    const modalSelectClass = ['max-w-4xl', 'max-h-[80vh]'];
    const modalListClass = ['max-w-7xl', 'h-[85vh]'];

    const containerSelectClass = ['p-4', 'overflow-y-auto'];
    const containerListClass = ['p-0', 'overflow-hidden'];

    // Clean up any inline styles from previous fixes first
    container.style.padding = '';
    container.style.overflow = '';

    if (isListMode) {
        // Switch to List Mode
        modalContent.classList.remove(...modalSelectClass);
        modalContent.classList.add(...modalListClass);

        container.classList.remove(...containerSelectClass);
        container.classList.add(...containerListClass);
    } else {
        // Switch to Select Mode
        modalContent.classList.remove(...modalListClass);
        modalContent.classList.add(...modalSelectClass);

        container.classList.remove(...containerListClass);
        container.classList.add(...containerSelectClass);
    }

    const t = TRANSLATIONS[currentLang];
    modalTitle.innerText = isListMode ? (t.modal_title_list || 'Recruit List') : (t.modal_title || 'Select Recruit');

    modal.style.display = 'flex';
    document.body.classList.add('overflow-hidden'); // Lock body scroll

    // Check if we need to render (or re-render for language change? better to clear and re-render if needed, but for now simple check)
    // Actually, we should clear it if language might have changed, but let's stick to simple first or just re-render always?
    // Re-rendering always is safer for language switches.

    // console.log("Rendering recruit list by race...");
    try {
        // Group by race
        const races = {};
        RECRUIT_DATA.forEach(r => {
            const race = r.race || 'Unknown';
            if (!races[race]) races[race] = [];
            races[race].push(r);
        });

        // Current Filters State (Closure scope for this render)
        const selectedRaces = new Set(['all']);
        const selectedReasons = new Set(['all']); // NEW: Reason Filter
        let currentGender = 'all';
        let isUniqueFilter = false;

        // Badge Colors
        const badgeColors = {
            "quest": "bg-indigo-500 text-white", // Quest (Guildhests/Leves/GC)
            "gs": "bg-yellow-400 text-yellow-900",
            "fates": "bg-blue-600 text-white",
            "dungeons": "bg-purple-600 text-white",
            "gathering": "bg-emerald-600 text-white", // Gathering (DoL/Map)
            "doh": "bg-slate-600 text-white",
            "pvp": "bg-rose-600 text-white"
        };

        let html = '';

        // List Mode Layout Wrapper
        if (isListMode) {
            // Outer flex container filling the modal body
            html += `<div class="flex flex-col h-full">`;

            // Filter Bar
            html += `<div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-3 sticky top-0 z-30 shadow-sm">`;

            html += `<div class="flex flex-wrap gap-4 items-start">`;

            // Race Buttons
            html += `
                <div class="flex flex-wrap gap-1 items-center">
                    <span class="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider select-none">Race:</span>
                    <div class="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-md">
                        <button class="px-2 py-1 rounded text-xs font-bold bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-200 transition-all filter-race select-none whitespace-nowrap" data-value="all">${t.all || 'All'}</button>
                        ${Object.keys(races).sort().map(r => `
                            <button class="px-2 py-1 rounded text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-600/50 transition-all filter-race select-none whitespace-nowrap" data-value="${r}">
                                ${(t.race_names && t.race_names[r]) || r}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            // Gender Buttons
            html += `
                <div class="flex items-center gap-1">
                    <span class="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider select-none">Gender:</span>
                    <div class="flex bg-slate-100 dark:bg-slate-700 rounded-md p-1 gap-1">
                        <button class="px-3 py-1 rounded text-xs font-bold bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-200 transition-all filter-gender select-none" data-value="all">${t.gender_all || t.all || 'All'}</button>
                        <button class="px-3 py-1 rounded text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all filter-gender select-none" data-value="F">${t.gender_f || 'F'}</button>
                        <button class="px-3 py-1 rounded text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all filter-gender select-none" data-value="M">${t.gender_m || 'M'}</button>
                    </div>
                </div>
            `;

            // Unique Button
            html += `
                 <div class="flex items-center gap-1">
                    <span class="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider select-none">Other:</span>
                    <button id="recruit-filter-unique-btn" class="px-3 py-1.5 rounded text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 box-border border-2 border-transparent transition-all select-none flex items-center gap-1">
                        <span>${t.label_unique || 'Unique'}</span>
                    </button>
                </div>
            `;

            // NEW: Reason Buttons - REMOVED (Moved to Sidebar)


            html += `</div></div>`;

            // Outer flex container filling the modal body (Wrapper)
            html += `<div class="flex flex-col md:flex-row flex-1 overflow-hidden relative">`;

            // Left Sidebar: Legend
            html += `<div class="w-full md:w-72 flex-shrink-0 bg-slate-50 dark:bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 overflow-y-auto custom-scrollbar z-20">`;
            // Sticky Header for Legend
            html += `<div class="sticky top-0 bg-slate-100 dark:bg-slate-800 p-4 border-b border-slate-300 dark:border-slate-600 z-10 shadow-sm">
                        <h4 class="font-bold text-lg text-slate-800 dark:text-slate-200">${t.legend_title || 'Legend'}</h4>
                        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">${t.legend_subtitle || 'Complete the following Challenge Log entries'}</div>
                     </div>`;
            html += `<div class="space-y-1 p-2">`;

            if (t.recruit_reasons) {
                const reasonKeys = Object.keys(t.recruit_reasons);
                reasonKeys.forEach(key => {
                    const short = (t.recruit_reasons_short && t.recruit_reasons_short[key]) || key;
                    const full = t.recruit_reasons[key];
                    const desc = (t.recruit_reasons_desc && t.recruit_reasons_desc[key]) || '';
                    const color = badgeColors[key] || 'bg-slate-500 text-white';

                    const isSelected = selectedReasons.has(key); // Check if selected
                    const activeClass = isSelected ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent';

                    html += `
                        <div class="filter-reason-sidebar cursor-pointer rounded-lg p-2 transition-all flex items-start gap-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${activeClass}" data-value="${key}">
                            <div class="w-[60px] flex justify-center shrink-0">
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight shadow-sm border border-white/20 flex-shrink-0 mt-0.5 ${color} min-w-[36px] text-center select-none">
                                    ${short}
                                </span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight select-none">${full}</span>
                                ${desc ? `<span class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight select-none">${desc}</span>` : ''}
                            </div>
                        </div>
                    `;
                });
            }

            html += `</div></div>`;

            // Right Content: Grid Wrapper
            // Add relative to establish clear scrolling context for sticky children
            html += `<div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-800/50 relative">`;
        }

        // Custom Race Order (Game Order)
        const raceOrder = ['Hyur', 'Elezen', 'Lalafell', "Miqo'te", 'Roegadyn', 'Au Ra'];
        Object.keys(races).sort((a, b) => {
            const idxA = raceOrder.indexOf(a);
            const idxB = raceOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        }).forEach(race => {
            const raceName = (t.race_names && t.race_names[race]) || race;
            // Sticky header for both modes
            // Added ring-1 ring-black/5 for better separation
            html += `<div class="bg-slate-100 dark:bg-slate-700 p-2 font-bold sticky top-0 border-l-4 border-blue-500 z-30 text-slate-800 dark:text-slate-200 mb-2 mt-4 text-lg shadow-md ring-1 ring-black/5 rounded-r">${raceName}</div>`;
            html += `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">`;
            html += races[race].map(r => {
                const isUnique = r.unique;
                return `
                <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center transition-all bg-white dark:bg-slate-800 recruit-option flex flex-col items-center justify-between group shadow-sm ${!isListMode ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500' : ''}" 
                    data-name="${r.name}" 
                    data-race="${r.race}" 
                    data-gender="${r.gender}" 
                    data-name="${r.name}" 
                    data-race="${r.race}" 
                    data-gender="${r.gender}" 
                    data-unique="${r.unique}" 
                    data-reasons="${(r.reasons || []).join(',')}" 
                    data-search="${(r.name + ' ' + ((t.recruit_names && t.recruit_names[r.name]) || '') + ' ' + (r.reasons || []).map(rs => (t.recruit_reasons_short && t.recruit_reasons_short[rs]) || rs).join(' ')).toLowerCase()}">
                    <div class="flex flex-col items-center w-full">
                        <div class="w-28 h-36 mx-auto mb-1 relative bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shadow-md border border-slate-300 dark:border-slate-600 ${!isListMode ? 'group-hover:shadow-lg' : ''} transition-all">
                            <img src="${r.img}" alt="${r.name}" loading="lazy" class="w-full h-full object-cover ${!isListMode ? 'transition-transform duration-500 group-hover:scale-105' : ''}" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden')">
                            <div class="absolute inset-0 flex items-center justify-center font-bold text-slate-500 hidden recruit-fallback text-2xl">${r.name.substring(0, 2)}</div>
                            
                            <!-- Rarity Ribbon -->
                            ${isUnique ? `
                                <div class="absolute top-[10px] -right-[28px] w-24 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-white text-[9px] font-black py-[2px] rotate-45 text-center shadow-md border-y border-yellow-200/50 z-10 select-none tracking-wider drop-shadow-sm">
                                    UR ★★★
                                </div>
                            ` : ''}
                            
                            <!-- Overlaid Badges -->
                            <div class="absolute bottom-0 left-0 w-full p-1 flex flex-wrap-reverse justify-center gap-1 pointer-events-none bg-gradient-to-t from-black/80 to-transparent pt-4">
                                ${(r.reasons || []).map(reasonKey => `
                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight shadow-sm border border-white/20 pointer-events-auto cursor-help ${badgeColors[reasonKey] || 'bg-slate-500 text-white'}" title="${(t.recruit_reasons && t.recruit_reasons[reasonKey]) || reasonKey}">
                                        ${(t.recruit_reasons_short && t.recruit_reasons_short[reasonKey]) || (t.recruit_reasons && t.recruit_reasons[reasonKey]) || reasonKey}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="text-base font-bold text-slate-800 dark:text-slate-200 truncate w-full px-1">${(t.recruit_names && t.recruit_names[r.name]) || r.name}</div>
                    </div>
                </div>
            `}).join('');
            html += `</div>`;
        });

        if (isListMode) {
            html += `</div></div></div>`; // Close grid wrapper, split pane, and vertical main layout
        }

        container.innerHTML = html;

        if (isListMode) {
            const raceBtns = document.querySelectorAll('.filter-race');
            const genderBtns = document.querySelectorAll('.filter-gender');
            const reasonBtns = document.querySelectorAll('.filter-reason-sidebar');
            const uniqueBtn = document.getElementById('recruit-filter-unique-btn');

            let selectedRaces = new Set(['all']);
            let selectedReasons = new Set(['all']);
            let currentGender = 'all';
            let isUniqueFilter = false;

            const filterFunc = () => {
                const container = document.getElementById('recruit-list-container');
                const grids = container.querySelectorAll('.grid');

                grids.forEach(grid => {
                    const cards = grid.querySelectorAll('.recruit-option');
                    let visibleCount = 0;
                    cards.forEach(card => {
                        const rRace = card.dataset.race;
                        const rGender = card.dataset.gender;
                        const rUnique = card.dataset.unique === 'true';
                        const rReasons = (card.dataset.reasons || '').split(',');

                        let visible = true;
                        if (!selectedRaces.has('all') && !selectedRaces.has(rRace)) visible = false;
                        if (currentGender !== 'all' && rGender !== currentGender) visible = false;
                        if (isUniqueFilter && !rUnique) visible = false;

                        // Reason Filter Check
                        if (!selectedReasons.has('all')) {
                            const hasMatch = rReasons.some(r => selectedReasons.has(r));
                            if (!hasMatch) visible = false;
                        }

                        if (visible) {
                            card.classList.remove('hidden');
                            visibleCount++;
                        } else {
                            card.classList.add('hidden');
                        }
                    });

                    // Toggle Race Section Visibility (Header + Grid)
                    // The Header is the previous sibling of the grid
                    const header = grid.previousElementSibling;
                    if (visibleCount > 0) {
                        grid.classList.remove('hidden');
                        if (header) header.classList.remove('hidden');
                    } else {
                        grid.classList.add('hidden');
                        if (header) header.classList.add('hidden');
                    }
                });
            };

            // Race Filter Buttons
            raceBtns.forEach(btn => {
                btn.onclick = (e) => {
                    const val = e.currentTarget.dataset.value;

                    if (val === 'all') {
                        selectedRaces.clear();
                        selectedRaces.add('all');
                    } else {
                        if (selectedRaces.has('all')) selectedRaces.delete('all');

                        if (selectedRaces.has(val)) {
                            selectedRaces.delete(val);
                        } else {
                            selectedRaces.add(val);
                        }

                        if (selectedRaces.size === 0) selectedRaces.add('all');
                    }

                    // Update UI
                    raceBtns.forEach(b => {
                        const bVal = b.dataset.value;
                        if (selectedRaces.has(bVal)) {
                            b.classList.remove('text-slate-500', 'dark:text-slate-400', 'font-medium', 'hover:bg-white/50', 'dark:hover:bg-slate-600/50');
                            b.classList.add('bg-white', 'dark:bg-slate-600', 'shadow-sm', 'font-bold', 'text-slate-800', 'dark:text-slate-200');
                        } else {
                            b.classList.remove('bg-white', 'dark:bg-slate-600', 'shadow-sm', 'font-bold', 'text-slate-800', 'dark:text-slate-200');
                            b.classList.add('text-slate-500', 'dark:text-slate-400', 'font-medium', 'hover:bg-white/50', 'dark:hover:bg-slate-600/50');
                        }
                    });

                    filterFunc();
                };
            });

            // Gender Filter Buttons
            genderBtns.forEach(btn => {
                btn.onclick = (e) => {
                    genderBtns.forEach(b => {
                        b.classList.remove('bg-white', 'dark:bg-slate-600', 'shadow-sm', 'font-bold', 'text-slate-800', 'dark:text-slate-200');
                        b.classList.add('text-slate-500', 'dark:text-slate-400', 'font-medium');
                    });
                    e.currentTarget.classList.remove('text-slate-500', 'dark:text-slate-400', 'font-medium');
                    e.currentTarget.classList.add('bg-white', 'dark:bg-slate-600', 'shadow-sm', 'font-bold', 'text-slate-800', 'dark:text-slate-200');

                    currentGender = e.currentTarget.dataset.value;
                    filterFunc();
                };
            });

            // NEW: Reason Filter Buttons logic (Sidebar)
            reasonBtns.forEach(btn => {
                btn.onclick = (e) => {
                    const val = e.currentTarget.dataset.value;

                    // Toggle logic
                    // If clicking same item, toggle off.
                    // If clicking different, add.
                    // "All" logic is implicit: if size 0, then all.

                    if (selectedReasons.has(val)) {
                        selectedReasons.delete(val);
                    } else {
                        // If we are currently in "all" state (size 1 and has 'all'), clear it first
                        if (selectedReasons.has('all')) selectedReasons.clear();
                        selectedReasons.add(val);
                    }

                    // If empty, revert to all
                    if (selectedReasons.size === 0) selectedReasons.add('all');

                    // Update UI
                    reasonBtns.forEach(b => {
                        const bVal = b.dataset.value;
                        if (selectedReasons.has(bVal)) {
                            b.classList.remove('hover:bg-slate-100', 'dark:hover:bg-slate-800', 'border-transparent');
                            b.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'ring-1', 'ring-blue-500/50');
                        } else {
                            b.classList.remove('bg-blue-50', 'dark:bg-blue-900/30', 'ring-1', 'ring-blue-500/50');
                            b.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-800', 'border-transparent');
                        }
                    });

                    filterFunc();
                };
            });

            // Unique Toggle Button
            if (uniqueBtn) {
                uniqueBtn.onclick = () => {
                    isUniqueFilter = !isUniqueFilter;
                    if (isUniqueFilter) {
                        uniqueBtn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400', 'border-transparent');
                        uniqueBtn.classList.add('bg-yellow-50', 'dark:bg-yellow-900/30', 'text-yellow-700', 'dark:text-yellow-400', 'border-yellow-400');
                        uniqueBtn.querySelector('span').classList.add('font-bold');
                    } else {
                        uniqueBtn.classList.remove('bg-yellow-50', 'dark:bg-yellow-900/30', 'text-yellow-700', 'dark:text-yellow-400', 'border-yellow-400');
                        uniqueBtn.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400', 'border-transparent');
                        uniqueBtn.querySelector('span').classList.remove('font-bold');
                    }
                    filterFunc();
                };
            }
        }

        // Add event listener for delegation if not duplicated (container innerHTML cleared so OK)
        container.onclick = function (event) {
            if (isListMode) return; // Do nothing in list mode for now
            const option = event.target.closest('.recruit-option');
            if (option) {
                const name = option.getAttribute('data-name');
                // console.log("Selected:", name);
                selectRecruit(name);
                saveSquadronData();
            }
        };
    } catch (e) {
        console.error("Error rendering list:", e);
        container.innerHTML = `<div style="color:red; padding:20px;">Error rendering list: ${e.message}</div>`;
    }
}

function closeRecruitModal() {
    document.getElementById('recruit-modal').style.display = 'none';
    document.body.classList.remove('overflow-hidden'); // Unlock body scroll
    currentSlotIndex = -1;
}

window.selectRecruit = function (name) {
    if (currentSlotIndex === -1) return;

    // Auto-enable if disabled
    const cb = document.getElementById(`active-${currentSlotIndex}`);
    if (cb && !cb.checked) {
        cb.checked = true;
        toggleMember(currentSlotIndex);
    }

    const rData = RECRUIT_DATA.find(r => r.name === name);
    if (!rData) return;

    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];

    // Update UI
    const nameInput = document.getElementById(`name-${currentSlotIndex}`);
    nameInput.value = (t.recruit_names && t.recruit_names[name]) || name;
    nameInput.setAttribute('data-recruit-id', name);

    // Update Header Image
    const headerDiv = nameInput.parentElement.previousElementSibling;
    headerDiv.innerHTML = `<img src="${rData.img}" class="w-full h-full object-cover">`;

    closeRecruitModal();
}


// Custom Class Dropdown Logic
let activeDropdownIndex = -1;

window.toggleClassDropdown = function (index, e) {
    e = e || window.event;
    // Close others
    if (activeDropdownIndex !== -1 && activeDropdownIndex !== index) {
        const prevMenu = document.getElementById(`class-dd-menu-${activeDropdownIndex}`);
        if (prevMenu) prevMenu.classList.add('hidden');
    }

    const menu = document.getElementById(`class-dd-menu-${index}`);
    if (menu) {
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            activeDropdownIndex = index;
        } else {
            menu.classList.add('hidden');
            activeDropdownIndex = -1;
        }
    }

    // Prevent event bubbling to window click
    if (e && e.stopPropagation) {
        e.stopPropagation();
    } else if (e) {
        e.cancelBubble = true;
    }
}

window.selectClass = function (index, clsKey, e) {
    if (e) e.stopPropagation();
    // Update value
    document.getElementById(`class-${index}`).value = clsKey;

    // Update UI
    document.getElementById(`class-icon-${index}`).src = CLASS_ICONS[clsKey];
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    document.getElementById(`class-text-${index}`).innerText = (t.class_names && t.class_names[clsKey]) || clsKey;

    // Close menu
    document.getElementById(`class-dd-menu-${index}`).classList.add('hidden');
    activeDropdownIndex = -1;

    // Update stats
    updateStatsDisplay(index);
}

// Global click to close dropdowns
window.onclick = function (event) {
    const modal = document.getElementById('recruit-modal');
    const dataModal = document.getElementById('data-modal');

    if (event.target == modal) {
        closeRecruitModal();
    }
    if (event.target == dataModal) {
        closeDataModal();
    }

    if (activeDropdownIndex !== -1) {
        // If click is outside the active dropdown container
        if (!event.target.closest(`#class-dd-container-${activeDropdownIndex}`)) {
            document.getElementById(`class-dd-menu-${activeDropdownIndex}`).classList.add('hidden');
            activeDropdownIndex = -1;
        }
    }
}

window.toggleMember = function (index) {
    const checkbox = document.getElementById(`active-${index}`);
    const card = document.getElementById(`card-${index}`);
    const inputs = card.querySelectorAll('select, input:not(.active-checkbox), button');

    if (checkbox.checked) {
        card.classList.remove('disabled');
        inputs.forEach(el => el.disabled = false);
    } else {
        card.classList.add('disabled');
        inputs.forEach(el => el.disabled = true);
    }
}

function getStats(clsKey, level) {
    const stats = CLASS_LEVEL_STATS[clsKey];
    if (!stats) return [0, 0, 0];

    // Ensure level is within bounds (1-60)
    let safeLevel = Math.max(1, Math.min(60, level));

    // Lookup exact value
    if (stats[safeLevel]) {
        return stats[safeLevel];
    }
    return [0, 0, 0];
}

window.updateStatsDisplay = function (index) {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    const cls = document.getElementById(`class-${index}`).value;
    const lvl = parseInt(document.getElementById(`lvl-${index}`).value) || 1;
    const s = getStats(cls, lvl);
    document.getElementById(`stats-display-${index}`).innerHTML =
        `<span class="stat-phy">${t.stat_p}:${s[0]}</span> <span class="stat-men">${t.stat_m}:${s[1]}</span> <span class="stat-tac">${t.stat_t}:${s[2]}</span>`;
}

// Theme Logic
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

// Init Theme and Roster (Auto execution)
(function () {
    // Init Roster First to ensure elements exist
    initRoster();

    const savedTheme = localStorage.getItem('ffxiv-tools-theme');
    if (savedTheme === 'dark' || !savedTheme) {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-toggle').innerText = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-toggle').innerText = '🌙';
    }

    // Init Language
    const langSelect = document.getElementById('lang-selector');
    if (langSelect) {
        langSelect.value = currentLang;
    }
    updateLanguage();

    // Auto-load if exists
    const saved = localStorage.getItem('ffxiv_squad_data');
    if (saved) {
        loadSquadronData(true);
    }
})();
