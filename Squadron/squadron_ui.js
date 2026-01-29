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
                if (typeof updateChemistryDisplay === 'function') updateChemistryDisplay(i); // Refresh chemistry text
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
    if (typeof updateSection1Summary === 'function') updateSection1Summary();
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

        // Chemistry
        const chemCond = document.getElementById(`chem-cond-${i}`).value || "";
        const chemEffect = document.getElementById(`chem-effect-${i}`).value || "";
        const chemVal = parseInt(document.getElementById(`chem-val-${i}`).value) || 0;

        recruits[(i + 1).toString()] = {
            "used": isActive,
            "class": CLASS_MAP_EXPORT[cls] || cls.toLowerCase(),
            "level": lvl,
            "race": (rData.race || "Unknown").toLowerCase(),
            "name": name,
            "exp": 0,
            "chemistry": {
                "condition": chemCond,
                "effect": chemEffect,
                "value": chemVal
            }
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

// Utilities
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const saveSquadronDataDebounced = debounce(() => {
    saveSquadronData();
}, 5000);

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
                        
                        // Chemistry - Load
                        if (rec.chemistry && !Array.isArray(rec.chemistry)) {
                            // New Object format
                             if (document.getElementById(`chem-cond-${i}`)) document.getElementById(`chem-cond-${i}`).value = rec.chemistry.condition || "";
                             if (document.getElementById(`chem-effect-${i}`)) document.getElementById(`chem-effect-${i}`).value = rec.chemistry.effect || "";
                             if (document.getElementById(`chem-val-${i}`)) document.getElementById(`chem-val-${i}`).value = rec.chemistry.value || 20;
                             
                             if (typeof updateChemistryDisplay === 'function') updateChemistryDisplay(i);
                        } else if (rec.chemistry && Array.isArray(rec.chemistry)) {
                            // Legacy Legacy Array format? Just ignore or try to map if we had one
                        }

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
    // Pre-build options for Chemistry
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    
    let condOpts = `<option value="">-</option>`;
    if (typeof CHEMISTRY_CONDITIONS !== 'undefined') {
        condOpts += Object.entries(CHEMISTRY_CONDITIONS).map(([k, v]) => 
            `<option value="${k}">${v[currentLang] || v['zh-TW']}</option>`
        ).join('');
    }

    let effectOpts = `<option value="">-</option>`;
    if (typeof CHEMISTRY_EFFECTS !== 'undefined') {
        effectOpts += Object.entries(CHEMISTRY_EFFECTS).map(([k, v]) => 
            `<option value="${k}">${v[currentLang] || v['zh-TW']}</option>`
        ).join('');
    }

    const valOpts = [10, 15, 20, 25, 30, 40, 50, 60, 100].map(v => 
        `<option value="${v}">${v}%</option>`
    ).join('');

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
        
        <!-- Level & Stats Row -->
        <div class="flex items-center justify-between gap-2 p-1">
            <div class="flex items-center gap-1 shrink-0">
                <label class="font-bold text-xs text-slate-500 dark:text-slate-400 pr-4">Lv: </label>
                <input type="number" id="lvl-${i}" value="${lvl}" min="1" max="60" onchange="updateStatsDisplay(${i})" class="w-10 p-0.5 text-center text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500" ${!isDefined ? 'disabled' : ''}>
            </div>
            <div class="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
            <div class="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 flex items-center justify-end w-full" id="stats-display-${i}" style="${!isDefined ? 'opacity: 0.5;' : ''}">
                <span class="stat stat-phy">P:0</span>
                <span class="stat stat-men">M:0</span>
                <span class="stat stat-tac">T:0</span>
            </div>
        </div>

        <!-- Chemistry UI -->
        <div class="mt-1 pt-2 border-t border-slate-200 dark:border-slate-700">
             <!-- Hidden Inputs for Persistence -->
             <input type="hidden" id="chem-cond-${i}" value="">
             <input type="hidden" id="chem-effect-${i}" value="">
             <input type="hidden" id="chem-val-${i}" value="">

             <div id="chem-display-${i}" class="text-xs text-slate-700 dark:text-slate-300 leading-tight pb-2"></div>

             <button type="button" onclick="openChemistryModal(${i})" class="w-full py-1.5 px-2 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors flex items-center justify-center gap-1" ${!isDefined ? 'disabled' : ''}>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                設定吉兆
             </button>
        </div>
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
        `<span class="stat stat-phy">${t.stat_p}:${s[0]}</span> <span class="stat stat-men">${t.stat_m}:${s[1]}</span> <span class="stat stat-tac">${t.stat_t}:${s[2]}</span>`;
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

// ==========================================
// Training Button Logic
// ==========================================

let preTrainingValues = null;

// Hover Preview
window.previewTraining = function (opId) {
    const pInput = document.getElementById('curr-p');
    const mInput = document.getElementById('curr-m');
    const tInput = document.getElementById('curr-t');

    // Current Values
    const currentVals = {
        p: parseInt(pInput.value) || 0,
        m: parseInt(mInput.value) || 0,
        t: parseInt(tInput.value) || 0
    };

    const rank = parseInt(document.getElementById('rank-selector').value);
    const cap = RANK_CAPS[rank];

    const result = calculateTrainingResult(currentVals.p, currentVals.m, currentVals.t, opId, cap);

    if (!result.isValid) {
        // Show unavailable indicator
        updateDeltaDisplay('p', null, false);
        updateDeltaDisplay('m', null, false);
        updateDeltaDisplay('t', null, false);
        return;
    }

    // Calculate Deltas
    updateDeltaDisplay('p', result.p - currentVals.p, true);
    updateDeltaDisplay('m', result.m - currentVals.m, true);
    updateDeltaDisplay('t', result.t - currentVals.t, true);

    // Apply Highlight to Inputs
    applyHighlight(pInput, result.p, currentVals.p);
    applyHighlight(mInput, result.m, currentVals.m);
    applyHighlight(tInput, result.t, currentVals.t);
}

function updateDeltaDisplay(type, delta, isValid) {
    const el = document.getElementById(`delta-${type}`);
    // Reset classes
    el.className = 'text-xs font-bold h-4 text-center mt-1 transition-all opacity-100';

    if (isValid === false) {
        el.innerText = '不足'; // Insufficient
        el.classList.add('text-gray-400', 'dark:text-gray-500');
        return;
    }

    if (delta > 0) {
        el.innerText = `+${delta}`;
        el.classList.add('text-green-600', 'dark:text-green-400');
    } else if (delta < 0) {
        el.innerText = `${delta}`;
        el.classList.add('text-red-600', 'dark:text-red-400');
    } else {
        el.innerText = '';
        el.classList.add('opacity-0');
    }
}

function applyHighlight(input, newVal, oldVal) {
    input.classList.remove('text-green-600', 'text-red-600', 'font-bold', 'bg-green-50', 'bg-red-50', 'dark:bg-green-900/30', 'dark:bg-red-900/30');
    if (newVal > oldVal) {
        input.classList.add('text-green-600', 'font-bold', 'bg-green-50', 'dark:bg-green-900/30');
    } else if (newVal < oldVal) {
        input.classList.add('text-red-600', 'font-bold', 'bg-red-50', 'dark:bg-red-900/30');
    }
}

// Clear Preview
window.clearPreview = function () {
    ['p', 'm', 't'].forEach(type => {
        const el = document.getElementById(`delta-${type}`);
        if (el) {
            el.classList.remove('opacity-100');
            el.classList.add('opacity-0');
            el.innerText = '';
        }
    });

    const inputs = [
        document.getElementById('curr-p'),
        document.getElementById('curr-m'),
        document.getElementById('curr-t')
    ];
    inputs.forEach(input => {
        input.classList.remove('text-green-600', 'text-red-600', 'font-bold', 'bg-green-50', 'bg-red-50', 'dark:bg-green-900/30', 'dark:bg-red-900/30');
    });
}

// Confirmation Modal
let pendingOpId = null;

window.confirmTraining = function (opId) {
    // Check validation first
    const pInput = document.getElementById('curr-p');
    const mInput = document.getElementById('curr-m');
    const tInput = document.getElementById('curr-t');

    const p = parseInt(pInput.value) || 0;
    const m = parseInt(mInput.value) || 0;
    const t = parseInt(tInput.value) || 0;
    const rank = parseInt(document.getElementById('rank-selector').value);
    const cap = RANK_CAPS[rank];

    const result = calculateTrainingResult(p, m, t, opId, cap);
    if (!result.isValid) {
        // Optional: Shake animation or visual feedback?
        // For now, rely on Preview showing "不足"
        // Also can show a Toast or simple alert if user insists on clicking
        // alert("無法執行此訓練：屬性不足"); // Too intrusive?
        return;
    }

    pendingOpId = opId;

    // Update Modal
    const tLang = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    let displayName = opId.replace(/_/g, ' ').toUpperCase();
    if (tLang.training_ops && tLang.training_ops[opId]) {
        displayName = tLang.training_ops[opId];
    }

    document.getElementById('confirm-training-name').innerText = displayName;
    document.getElementById('confirm-training-img').src = `img/training/${getOpImage(opId)}`;

    // Show Modal
    document.getElementById('training-confirm-modal').classList.remove('hidden');

    // Bind Confirm Button
    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.onclick = () => {
        applyTraining(pendingOpId);
        closeConfirmModal();
    };
}

function getOpImage(id) {
    if (id.includes('phy') && id.includes('men')) return 'PM.png';
    if (id.includes('phy') && id.includes('tac')) return 'PT.png';
    if (id.includes('men') && id.includes('tac')) return 'MT.png';
    if (id.includes('phy')) return 'P.png';
    if (id.includes('men')) return 'M.png';
    if (id.includes('tac')) return 'T.png';
    return 'P.png';
}

window.closeConfirmModal = function () {
    document.getElementById('training-confirm-modal').classList.add('hidden');
    pendingOpId = null;
    clearPreview(); // Ensure state is reset when cancelling
}

window.applyTraining = function (opId) {
    const rank = parseInt(document.getElementById('rank-selector').value);
    const cap = RANK_CAPS[rank];

    // Apply based on PRE-TRAINING values (which are the real current database state)
    const base = preTrainingValues || {
        p: parseInt(document.getElementById('curr-p').value) || 0,
        m: parseInt(document.getElementById('curr-m').value) || 0,
        t: parseInt(document.getElementById('curr-t').value) || 0
    };

    const result = calculateTrainingResult(base.p, base.m, base.t, opId, cap);

    // Apply permanent
    document.getElementById('curr-p').value = result.p;
    document.getElementById('curr-m').value = result.m;
    document.getElementById('curr-t').value = result.t;

    // Reset preview state as this is now the new truth
    preTrainingValues = null;

    // Clear highlights
    const inputs = [
        document.getElementById('curr-p'),
        document.getElementById('curr-m'),
        document.getElementById('curr-t')
    ];
    inputs.forEach(input => input.classList.remove('text-green-600', 'text-red-600', 'font-bold', 'bg-green-50', 'bg-red-50', 'dark:bg-green-900/30', 'dark:bg-red-900/30'));

    validateSum();
    saveSquadronData();
}


// --- Chemistry Modal Logic ---

let editingMemberIndex = -1;

window.openChemistryModal = function(index) {
    editingMemberIndex = index;
    const condSelect = document.getElementById('chem-modal-cond');
    const effectSelect = document.getElementById('chem-modal-effect');
    const valSelect = document.getElementById('chem-modal-val');

    // Populate Options if empty (Lazy init)
    if (condSelect.options.length <= 1) { // Assuming default is 1 or 0
        populateChemistryOptions(); // Helper to refactor shared logic
    }

    // Load current values
    const currentCond = document.getElementById(`chem-cond-${index}`).value;
    const currentEffect = document.getElementById(`chem-effect-${index}`).value;
    const currentVal = document.getElementById(`chem-val-${index}`).value;

    condSelect.value = currentCond;
    effectSelect.value = currentEffect;
    valSelect.value = currentVal || "10"; // Default to 10 if empty

    document.getElementById('chemistry-modal').classList.remove('hidden');
}

window.closeChemistryModal = function() {
    document.getElementById('chemistry-modal').classList.add('hidden');
    editingMemberIndex = -1;
}

window.saveChemistry = function() {
    if (editingMemberIndex === -1) return;

    const cond = document.getElementById('chem-modal-cond').value;
    const effect = document.getElementById('chem-modal-effect').value;
    const val = document.getElementById('chem-modal-val').value;

    // Save to hidden inputs
    document.getElementById(`chem-cond-${editingMemberIndex}`).value = cond;
    document.getElementById(`chem-effect-${editingMemberIndex}`).value = effect;
    document.getElementById(`chem-val-${editingMemberIndex}`).value = val;

    updateChemistryDisplay(editingMemberIndex);
    closeChemistryModal();
    saveSquadronData(); // Auto-save for convenience? Or let user click save squad. Let's auto-save per user preference or simple flow.
}

window.removeChemistry = function() {
    if (editingMemberIndex === -1) return;

    document.getElementById(`chem-cond-${editingMemberIndex}`).value = "";
    document.getElementById(`chem-effect-${editingMemberIndex}`).value = "";
    document.getElementById(`chem-val-${editingMemberIndex}`).value = "";

    updateChemistryDisplay(editingMemberIndex);
    closeChemistryModal();
}

function updateChemistryDisplay(index) {
    const displayEl = document.getElementById(`chem-display-${index}`);
    const cond = document.getElementById(`chem-cond-${index}`).value;
    const effect = document.getElementById(`chem-effect-${index}`).value;
    const val = document.getElementById(`chem-val-${index}`).value;

    if (!cond || !effect) {
        const noChem = { "zh-TW": "(無吉兆)", "zh-CN": "(无吉兆)", "ja": "(ジンクスなし)", "en": "(No Chemistry)" };
        displayEl.innerText = noChem[currentLang] || noChem['zh-TW'];
        
        // Gray out
        displayEl.classList.remove('text-slate-700', 'dark:text-slate-300');
        displayEl.classList.add('text-slate-400', 'dark:text-slate-600');
        return;
    }

    // Build description string
    const tLang = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    
    // Helper to safe get translation
    const getT = (key, cat) => {
        if (cat === 'cond') return (CHEMISTRY_CONDITIONS[key] && (CHEMISTRY_CONDITIONS[key][currentLang] || CHEMISTRY_CONDITIONS[key]['zh-TW'])) || key;
        if (cat === 'effect') return (CHEMISTRY_EFFECTS[key] && (CHEMISTRY_EFFECTS[key][currentLang] || CHEMISTRY_EFFECTS[key]['zh-TW'])) || key;
        return key;
    };

    const condText = getT(cond, 'cond');
    const effectText = getT(effect, 'effect');
    
    // Formatting: User requested narrative style with colors
    const cCond = `<span class="text-indigo-600 dark:text-indigo-400">${condText}</span>`;
    const cEffect = `<span class="text-emerald-600 dark:text-emerald-400">${effectText}</span>`;
    const cVal = `<span class="text-amber-600 dark:text-amber-400">${val}%</span>`;

    let text = "";
    if (currentLang === 'zh-TW' || currentLang === 'zh-CN') {
         text = `當 ${cCond}，自身 ${cEffect} ${cVal}`;
    } else if (currentLang === 'ja') {
         text = `${cCond}、自分 ${cEffect} ${cVal}`;
    } else {
         text = `When ${cCond}, self ${cEffect} ${cVal}`;
    }

    displayEl.innerHTML = `<div class="text-xs leading-tight">${text}</div>`;
    
    // Restore normal color
    displayEl.classList.remove('text-slate-400', 'dark:text-slate-600');
    displayEl.classList.add('text-slate-700', 'dark:text-slate-300');
}

function populateChemistryOptions() {
    // Populate Modal Options from Data
    const condSelect = document.getElementById('chem-modal-cond');
    const effectSelect = document.getElementById('chem-modal-effect');
    const valSelect = document.getElementById('chem-modal-val');

    // Reset
    condSelect.innerHTML = '<option value="">(無)</option>';
    effectSelect.innerHTML = '<option value="">(無)</option>';
    valSelect.innerHTML = '';

    if (typeof CHEMISTRY_CONDITIONS !== 'undefined') {
        Object.entries(CHEMISTRY_CONDITIONS).forEach(([k, v]) => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.innerText = v[currentLang] || v['zh-TW'];
            condSelect.appendChild(opt);
        });
    }

    if (typeof CHEMISTRY_EFFECTS !== 'undefined') {
        Object.entries(CHEMISTRY_EFFECTS).forEach(([k, v]) => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.innerText = v[currentLang] || v['zh-TW'];
            effectSelect.appendChild(opt);
        });
    }

    [10, 15, 20, 25, 30, 40, 50, 60, 100].forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.innerText = `${v}%`;
        valSelect.appendChild(opt);
    });
}

// --- Mission Affinity Logic ---
window.initAffinitySelectors = function() {
    const selectors = [
        document.getElementById('mission-affinity-1'),
        document.getElementById('mission-affinity-2'),
        document.getElementById('mission-affinity-3')
    ];

    if (!selectors[0]) return;

    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    const raceNames = t.race_names || {};
    const classNames = t.class_names || {};

    // Preserve current selections if possible
    const currentSelections = selectors.map(s => s.value);

    selectors.forEach((sel, idx) => {
        sel.innerHTML = '<option value="">-</option>';
        
        // Races
        const groupRace = document.createElement('optgroup');
        groupRace.label = t.label_race || (currentLang === 'en' ? 'Race' : '種族'); // Fallback label if not in data
        Object.entries(raceNames).forEach(([k, v]) => {
            const opt = document.createElement('option');
            opt.value = k; // e.g. "Hyur"
            opt.innerText = v;
            groupRace.appendChild(opt);
        });
        sel.appendChild(groupRace);

        // Classes
        const groupClass = document.createElement('optgroup');
        groupClass.label = t.label_class || (currentLang === 'en' ? 'Class' : '職業');
        Object.entries(classNames).forEach(([k, v]) => {
            const opt = document.createElement('option');
            opt.value = k; // e.g. "GLA"
            opt.innerText = v;
            groupClass.appendChild(opt);
        });
        sel.appendChild(groupClass);

        // Restore selection
        if (currentSelections[idx]) {
            sel.value = currentSelections[idx];
        }
    });

    updateAffinityConfig();
}

window.updateAffinityConfig = function() {
    const selectors = [
        document.getElementById('mission-affinity-1'),
        document.getElementById('mission-affinity-2'),
        document.getElementById('mission-affinity-3')
    ];
    
    // Get all currently selected values (excluding empty)
    const selectedValues = selectors.map(s => s.value).filter(v => v);

    // Update disabled state for uniqueness
    selectors.forEach(sel => {
        const myVal = sel.value;
        Array.from(sel.options).forEach(opt => {
            if (!opt.value) return; // Skip default
            // Disable if selected elsewhere AND not self
            if (selectedValues.includes(opt.value) && opt.value !== myVal) {
                opt.disabled = true;
                opt.innerText = opt.innerText.replace(' (Selected)', '') + ' (Selected)'; // Visual feedback? maybe overkill.
                // Actually just disabled is enough usually.
            } else {
                opt.disabled = false;
                opt.innerText = opt.innerText.replace(' (Selected)', '');
            }
        });
    });

    if (typeof updateMissionReqs === 'function') updateMissionReqs();
}

// --- Mission Selector Logic ---
function initMissionSelectors() {
    const listSelect = document.getElementById('mission-selector');
    if (!listSelect) return;

    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    
    // Clear and add Default
    listSelect.innerHTML = '';
    const defOpt = document.createElement('option');
    defOpt.value = "";
    defOpt.innerText = t.placeholder_mission || "Select Mission...";
    listSelect.appendChild(defOpt);

    // Use MISSION_DATA to populate optgroups
    if (typeof MISSION_DATA === 'undefined') {
        console.error("MISSION_DATA not found!");
        return;
    }

    const categories = ["IMPORTANT", "TRAINEE", "ROUTINE", "PRIORITY"];

    categories.forEach((catKey, index) => {
        const group = document.createElement('optgroup');
        
        // Add alternating background colors for better visibility
        if (index % 2 === 0) {
            group.className = "bg-slate-100 dark:bg-slate-800";
        } else {
            group.className = "bg-slate-200 dark:bg-slate-900";
        }
        
        // Use translation from data
        let label = (t.mission_categories && t.mission_categories[catKey]) || catKey;
        // Fallback for missing keys
        if (!label) label = catKey;
        
        group.label = label;

        // Filter flat MISSION_DATA by category
        const missions = MISSION_DATA.filter(m => m.category === catKey);
        missions.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            
            const nameObj = m.name;
            let name = nameObj[currentLang] || nameObj['en'];
            // Fallback for zh-CN to zh-TW if mission name missing
            if (!name && currentLang === 'zh-CN') name = nameObj['zh-TW']; 
            if (!name) name = m.id;

            if (m.lvl) {
                name += ` - Lv ${m.lvl}`;
            }

            opt.innerText = name;
            group.appendChild(opt);
        });

        if (missions.length > 0) {
            listSelect.appendChild(group);
        }
    });

    // Patterns
    
    const patternSelect = document.getElementById('mission-pattern');
    if (patternSelect) {
        patternSelect.innerHTML = '';
        const defOpt = document.createElement('option');
        defOpt.innerText = t.placeholder_pattern_locked || "Select Mission First";
        patternSelect.appendChild(defOpt);
        patternSelect.disabled = true;
        patternSelect.dataset.missionId = ""; // Reset tracker
    }
}

window.updateMissionReqs = function() {
    const listSelect = document.getElementById('mission-selector');
    const patternSelect = document.getElementById('mission-pattern');
    if (!listSelect || !patternSelect) return;

    const missionId = listSelect.value;
    const lastMissionId = patternSelect.dataset.missionId;

    // Find mission in flat array
    let mission = null;
    if (missionId && typeof MISSION_DATA !== 'undefined') {
        mission = MISSION_DATA.find(m => m.id === missionId);
    }

    // Check if we need to regenerate options (Mission changed)
    if (missionId !== lastMissionId) {
        patternSelect.innerHTML = '';
        patternSelect.dataset.missionId = missionId || "";

        if (mission && mission.stats) {
            patternSelect.disabled = false; // Enable
            mission.stats.forEach((stats, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.innerText = `${stats[0]} / ${stats[1]} / ${stats[2]}`;
                patternSelect.appendChild(opt);
            });
            // Auto-select first (default behavior)
        } else {
            // No mission -> Disable and show prompt
            patternSelect.disabled = true;
            const t = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[currentLang]) ? TRANSLATIONS[currentLang] : (typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS['zh-TW'] : {});
            const defOpt = document.createElement('option');
            defOpt.innerText = t.placeholder_pattern_locked || "Select Mission First";
            patternSelect.appendChild(defOpt);
        }
    }

    // Update Inputs based on selection
    if (!patternSelect.disabled && patternSelect.options.length > 0) {
        const patternIdx = parseInt(patternSelect.value) || 0;
        if (mission && mission.stats && mission.stats[patternIdx]) {
            const stats = mission.stats[patternIdx];
            document.getElementById('req-p').value = stats[0];
            document.getElementById('req-m').value = stats[1];
            document.getElementById('req-t').value = stats[2];
        }
    }
    if (typeof updateSection1Summary === 'function') updateSection1Summary();
}

// Initialization Hooks
document.addEventListener('DOMContentLoaded', () => {
    // If initRoster wasn't called yet, we might need to call it if it wasn't in index.html logic
    // Checking previous code, initRoster wasn't auto-called in global scope.
    // It's likely intended to be called on load.
    if (typeof initRoster === 'function') initRoster();
    if (typeof loadSquadronData === 'function') loadSquadronData(true); // Silent load

    initMissionSelectors();
    if (typeof initAffinitySelectors === 'function') initAffinitySelectors();
});

// Hook into language change to refresh selectors
// Store original reference if not already hooked
if (!window._originalChangeLanguage) {
    window._originalChangeLanguage = window.changeLanguage;
    window.changeLanguage = function(lang) {
        if (window._originalChangeLanguage) window._originalChangeLanguage(lang);
        initMissionSelectors();
        if (typeof initAffinitySelectors === 'function') initAffinitySelectors();
    };
}

// --- Section 1 Collapsible Logic ---
window.toggleSection1 = function() {
    const content = document.getElementById('section-1-content');
    const summary = document.getElementById('section-1-summary');
    const btn = document.getElementById('btn-toggle-s1');
    const container = document.getElementById('section-1-container') || content; // Ensure we target the right element

    // Helper: Animation End
    const onTransitionEnd = () => {
        if (content.classList.contains('hidden-state')) {
            summary.classList.remove('hidden');
            summary.classList.add('flex');
            // Hard hide after animation
            content.style.display = 'none';
        } else {
             content.style.height = 'auto'; // Reset to auto after expand
        }
        content.removeEventListener('transitionend', onTransitionEnd);
    };

    if (content.classList.contains('hidden-state')) {
        // EXPAND
        content.style.display = 'block'; // Unhide to calculate height
        const height = content.scrollHeight; // Get natural height
        content.style.height = '0px'; // Force 0 start
        content.classList.remove('hidden-state', 'opacity-0', 'scale-y-0'); // Remove hide logic
        
        // Hide summary immediately on expand start
        summary.classList.add('hidden');
        summary.classList.remove('flex');
        
        // Trigger reflow
        void content.offsetWidth;
        
        // Animate to full height
        content.style.transition = 'height 0.3s ease-out, opacity 0.3s ease-out';
        content.style.height = height + 'px';
        content.style.opacity = '1';
        
        btn.style.transform = 'rotate(0deg)';
        
        content.addEventListener('transitionend', onTransitionEnd);
        
    } else {
        // COLLAPSE
        updateSection1Summary();
        
        // Freeze height for animation
        content.style.height = content.scrollHeight + 'px';
        content.style.opacity = '1';
        
        // Trigger reflow
        void content.offsetWidth;
        
        // Animate to 0
        content.style.transition = 'height 0.3s ease-out, opacity 0.3s ease-out';
        content.style.height = '0px';
        content.style.opacity = '0';
        
        content.classList.add('hidden-state'); // logical state
        btn.style.transform = 'rotate(-90deg)';
        
        content.addEventListener('transitionend', onTransitionEnd);
    }
}

window.updateSection1Summary = function() {
    const p = document.getElementById('curr-p').value || "0";
    const m = document.getElementById('curr-m').value || "0";
    const t = document.getElementById('curr-t').value || "0";
    
    document.getElementById('sum-p').innerText = p;
    document.getElementById('sum-m').innerText = m;
    document.getElementById('sum-t').innerText = t;

    const reqP = document.getElementById('req-p').value || "0";
    const reqM = document.getElementById('req-m').value || "0";
    const reqT = document.getElementById('req-t').value || "0";

    document.getElementById('sum-req-p').innerText = reqP;
    document.getElementById('sum-req-m').innerText = reqM;
    document.getElementById('sum-req-t').innerText = reqT;
}
