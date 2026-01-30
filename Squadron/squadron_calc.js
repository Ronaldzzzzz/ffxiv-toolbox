// Squadron Calculator - Calculation Logic
// 運算邏輯獨立檔案

// Flag: 資料是否為最新（計算後設為 true，切換 tab 時依據此 flag 執行模擬）
window._dataIsFresh = false;

/**
 * 計算 n 取 k 的所有組合
 * @param {Array} arr - 原始陣列
 * @param {number} k - 取出的數量
 * @returns {Array} 所有組合
 */
function getCombinations(arr, k) {
    let i, subI, ret = [], sub, next;
    for (i = 0; i < arr.length; i++) {
        if (k === 1) {
            ret.push([arr[i]]);
        } else {
            sub = getCombinations(arr.slice(i + 1), k - 1);
            for (subI = 0; subI < sub.length; subI++) {
                next = sub[subI];
                next.unshift(arr[i]);
                ret.push(next);
            }
        }
    }
    return ret;
}

/**
 * 計算小隊的綜合屬性 (包含吉兆加成)
 * @param {Array} squad - 隊員陣列
 * @param {Array} affinities - 任務相性
 * @param {number} missionLevel - 任務所需等級 (可選)
 * @returns {Object} { bp, bm, bt, rawP, rawM, rawT, chemStats, activeChems }
 */
function calculateSquadStats(squad, affinities, missionLevel = 0) {
    let bp = 0, bm = 0, bt = 0;
    
    // 1. Base Stats
    squad.forEach(m => { 
        bp += m.stats[0]; 
        bm += m.stats[1]; 
        bt += m.stats[2]; 
    });
    const rawP = bp, rawM = bm, rawT = bt;

    // 建立統計資料供條件檢查使用
    const races = squad.map(m => m.race);
    const classes = squad.map(m => m.cls);
    const raceCounts = {};
    const classCounts = {};
    races.forEach(r => { raceCounts[r] = (raceCounts[r] || 0) + 1; });
    classes.forEach(c => { classCounts[c] = (classCounts[c] || 0) + 1; });

    // 2. Chemistry
    const activeChems = [];
    const teamBonuses = { p: 0, m: 0, t: 0 }; // 全員加成

    squad.forEach(member => {
        if (!member.chem || !member.chem.cond || !member.chem.effect) return;

        let isActive = false;
        let multiplier = 1;
        let reason = "";

        // 檢查是否有相性加成 (x2)
        const hasAffinity = affinities.includes(member.race) || affinities.includes(member.cls);
        if (hasAffinity) {
            multiplier = 2;
            reason = "Affinity (x2)";
        }

        // 檢查條件是否滿足
        isActive = checkChemistryCondition(
            member.chem.cond, 
            member, 
            squad, 
            races, 
            classes, 
            raceCounts, 
            classCounts, 
            missionLevel
        );

        if (isActive) {
            const val = member.chem.val * multiplier;
            const effect = member.chem.effect;
            const isTeamEffect = effect.startsWith('stats_all_');
            
            if (isTeamEffect) {
                // 全員效果：加成應用到全隊基礎數值
                const bonus = (stat) => Math.floor(stat * val / 100);
                if (effect === 'stats_all_phy') teamBonuses.p += bonus(rawP);
                if (effect === 'stats_all_men') teamBonuses.m += bonus(rawM);
                if (effect === 'stats_all_tac') teamBonuses.t += bonus(rawT);
            } else {
                // 個人效果：加成應用到該成員的個人數值
                const bonus = (stat) => Math.floor(stat * val / 100);
                if (effect === 'stats_phy') bp += bonus(member.stats[0]);
                if (effect === 'stats_men') bm += bonus(member.stats[1]);
                if (effect === 'stats_tac') bt += bonus(member.stats[2]);
            }
            
            activeChems.push({ memberId: member.id, effect, val, reason, isTeamEffect });
        }
    });

    // 應用全員加成
    bp += teamBonuses.p;
    bm += teamBonuses.m;
    bt += teamBonuses.t;

    return { 
        bp, bm, bt, 
        rawP, rawM, rawT, 
        chemStats: { p: bp - rawP, m: bm - rawM, t: bt - rawT },
        activeChems 
    };
}

/**
 * 檢查吉兆條件是否滿足
 */
function checkChemistryCondition(cond, member, squad, races, classes, raceCounts, classCounts, missionLevel) {
    const others = squad.filter(m => m.id !== member.id);
    
    // 種族同行條件
    const raceMap = {
        'with_race_hyur': 'Hyur', 'with_race_elezen': 'Elezen', 'with_race_lalafell': 'Lalafell',
        'with_race_miqote': "Miqo'te", 'with_race_roegadyn': 'Roegadyn', 'with_race_aura': 'Au Ra'
    };
    
    // 職業同行條件
    const classMap = {
        'with_class_gla': 'GLA', 'with_class_mrd': 'MRD', 'with_class_arc': 'ARC',
        'with_class_lnc': 'LNC', 'with_class_rog': 'ROG', 'with_class_pgl': 'PGL',
        'with_class_cnj': 'CNJ', 'with_class_thm': 'THM', 'with_class_acn': 'ACN'
    };
    
    switch (cond) {
        // 任務相關
        case 'in_squad':
            return true; // 執行任務時總是 true
        case 'm_level':
            return missionLevel > 0 && member.lvl >= missionLevel;
        case 'above_50':
            return member.lvl >= 50;
            
        // 種族同行
        case 'with_race_hyur':
        case 'with_race_elezen':
        case 'with_race_miqote':
        case 'with_race_lalafell':
        case 'with_race_roegadyn':
        case 'with_race_aura':
            return others.some(m => m.race === raceMap[cond]);
            
        // 職業同行
        case 'with_class_gla':
        case 'with_class_mrd':
        case 'with_class_arc':
        case 'with_class_lnc':
        case 'with_class_rog':
        case 'with_class_pgl':
        case 'with_class_cnj':
        case 'with_class_thm':
        case 'with_class_acn':
            return others.some(m => m.cls === classMap[cond]);
            
        // 種族組合條件
        case 'same_race':
            return raceCounts[member.race] >= 2;
        case 'no_same_race':
            return raceCounts[member.race] === 1;
        case 'all_diff_race':
            return Object.keys(raceCounts).length === squad.length;
        case '3+_race':
            return races.some(r => races.filter(x => x === r).length >= 3);
            
        // 職業組合條件
        case 'same_class':
            return classCounts[member.cls] >= 2;
        case 'no_same_class':
            return classCounts[member.cls] === 1;
        case 'all_diff_class':
            return Object.keys(classCounts).length === squad.length;
        case '3+_class':
            return classes.some(c => classes.filter(x => x === c).length >= 3);
            
        default:
            return false;
    }
}

/**
 * 等級提升模擬函式
 * 模擬隊員升級後是否能達成任務需求
 */
function simulateLevelUp() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    const resultSection = document.getElementById('result-section');
    const resultContent = document.getElementById('result-content-level');
    
    resultSection.classList.remove('hidden'); // Ensure visible
    switchResultTab('level'); // Activate Level tab

    // 檢查是否已有 100% 達標方案
    if (window._hasFullSolution) {
        resultContent.innerHTML = `
            <div class="bg-green-50 dark:bg-green-900/20 p-8 rounded-lg text-center border-2 border-green-200 dark:border-green-700">
                <div class="text-4xl mb-3">✅</div>
                <h3 class="text-green-700 dark:text-green-300 font-bold mb-2 text-lg">${t.msg_already_full || '方案已達標'}</h3>
                <p class="text-green-600 dark:text-green-400 mb-6">${t.msg_already_full_desc || '已找到 100% 達標方案，不需額外模擬。'}</p>
            </div>
        `;
        return;
    }

    if (!window._lastCalcParams) {
        resultContent.innerHTML = `<p class="text-red-600">${t.msg_error || '請先執行計算'}</p>`;
        return;
    }

    const { members, currTrain, reqP, reqM, reqT, affinities } = window._lastCalcParams;
    const rank = parseInt(document.getElementById('rank-selector').value);
    const cap = RANK_CAPS[rank];

    // Check if all members are already max level (60)
    if (members.every(m => m.lvl >= 60)) {
         resultContent.innerHTML = `
            <div class="bg-slate-100 dark:bg-slate-800 p-8 rounded-lg text-center border-2 border-slate-200 dark:border-slate-700">
                <div class="text-4xl mb-3">🎓</div>
                <h3 class="text-slate-700 dark:text-slate-200 font-bold mb-2 text-lg">${t.msg_all_max_level || '全員已達等級上限'}</h3>
                <p class="text-slate-500 dark:text-slate-400 mb-6">${t.msg_all_max_level_desc || '目前選取的隊員皆已達到 Lv 60，無法進行升級模擬。建議嘗試「轉職模擬」尋找突破口。'}</p>
                <button onclick="calculate()" class="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg shadow transition-colors font-bold">${t.btn_back || '返回計算'}</button>
            </div>
         `;
         return;
    }

    resultContent.innerHTML = `
        <div class="text-center py-8">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-4"></div>
            <p class="text-amber-600 dark:text-amber-400">${t.msg_simulating || '正在模擬等級提升...'}</p>
        </div>
    `;

    // 使用 setTimeout 讓 UI 先更新
    setTimeout(() => {
        const suggestions = [];
        const squads = getCombinations(members, 4);


        // Calculate Baseline (Best Partial of current squads)
        const currentSquads = getCombinations(members, 4);
        let baselineTotalMissing = Infinity;
        
        for (const squad of currentSquads) {
             const { bp, bm, bt } = calculateSquadStats(squad, affinities || []);
             const solution = solveTraining(bp, bm, bt, currTrain, reqP, reqM, reqT);
             if (solution.success) {
                 baselineTotalMissing = 0; 
                 break; 
             } else if (solution.partialSuccess) {
                 const missing = solution.missing.missingP + solution.missing.missingM + solution.missing.missingT;
                 if (missing < baselineTotalMissing) baselineTotalMissing = missing;
             }
        }
        
        console.log("Level Sim - Baseline Missing:", baselineTotalMissing);

        // 嘗試不同的等級增量 (1-20)
        for (let levelBoost = 1; levelBoost <= 20; levelBoost++) {
            
            for (const squad of squads) {
                // 模擬升級後的屬性
                const boostedSquad = squad.map(m => {
                    const newLvl = Math.min(60, m.lvl + levelBoost);
                    const newStats = getStats(m.cls, newLvl);
                    // Pass existing chemistry data
                    return { ...m, lvl: newLvl, stats: newStats, originalLvl: m.lvl };
                });

                // Calculate Stats including Chemistry with new Levels
                const { bp, bm, bt, chemStats, activeChems } = calculateSquadStats(boostedSquad, affinities || []);

                // 測試是否可達標
                const solution = solveTraining(bp, bm, bt, currTrain, reqP, reqM, reqT);

                let isValid = false;
                let isChemCritical = false;

                if (solution.success) {
                    isValid = true;
                    if (chemStats.p > 0 && (solution.finalStats.p - chemStats.p < reqP)) isChemCritical = true;
                    if (chemStats.m > 0 && (solution.finalStats.m - chemStats.m < reqM)) isChemCritical = true;
                    if (chemStats.t > 0 && (solution.finalStats.t - chemStats.t < reqT)) isChemCritical = true;
                } else if (solution.partialSuccess) {
                    const totalMissing = solution.missing.missingP + solution.missing.missingM + solution.missing.missingT;
                    // Strictly better than baseline
                    if (totalMissing < baselineTotalMissing) {
                        isValid = true;
                    }
                }

                if (isValid) {
                    suggestions.push({
                        squad: boostedSquad,
                        levelBoost,
                        steps: solution.path.length,
                        path: solution.path,
                        finalStats: solution.finalStats,
                        chemStats,
                        activeChems,
                        isChemCritical,
                        isPartial: !solution.success,
                        missing: solution.missing,
                        totalMissing: !solution.success ? (solution.missing.missingP + solution.missing.missingM + solution.missing.missingT) : 0
                    });
                }
            }

            // Optimization: If we found 100% solutions, we can probably stop looking excessively, or just collect enough unique ones.
            // But since we want "Minimum Level Boost", iterating 1..20 is correct.
            // If we found a 100% solution at this level, we might want to stop searching higher levels unless we want to find "more options"
            // Let's filter later.
            if (suggestions.filter(s => !s.isPartial).length >= 5) break; 
        }
        
        // Sort Suggestions
        // 1. Success first
        // 2. Lower Level Boost (cheaper)
        // 3. Lower Missing (if partial)
        suggestions.sort((a, b) => {
             if (a.isPartial !== b.isPartial) return a.isPartial ? 1 : -1;
             
             if (a.levelBoost !== b.levelBoost) return a.levelBoost - b.levelBoost;
             
             if (a.isPartial) {
                  return a.totalMissing - b.totalMissing;
             }
             return a.steps - b.steps;
        });
        
        // Filter unique and take top
        const uniqueSuggestions = [];
        const seen = new Set();
        for(let s of suggestions) {
             // Simple unique key based on member IDs and level boost
             const key = s.squad.map(m=>m.id).sort().join(',') + '-' + s.levelBoost;
             if(!seen.has(key)) {
                 uniqueSuggestions.push(s);
                 seen.add(key);
             }
             if(uniqueSuggestions.length >= 5) break;
        }
        const topSuggestions = uniqueSuggestions;

        // Store solutions in global for pinning
        window._levelSolutions = topSuggestions;

        if (topSuggestions.length === 0) {
            resultContent.innerHTML = `
                 <div class="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg text-center">
                    <p class="text-slate-600 dark:text-slate-400 mb-2">${t.msg_no_level_solution || '即使模擬升級，也未發現可行的方案。'}</p>
                    <button onclick="calculate()" class="text-blue-500 hover:text-blue-600 underline text-sm">${t.btn_back || '返回計算'}</button>
                </div>
            `;
        } else {
             // 顯示結果
             let html = `<div class="mb-4 text-center font-bold text-amber-600 dark:text-amber-400 text-lg">💡 ${t.msg_suggestions || '升級建議'}</div>`;
             
             topSuggestions.forEach((sol, idx) => {
                 // Stats Analysis preparation
                 const borderColor = sol.isPartial
                     ? 'border-orange-300 dark:border-orange-600'
                     : 'border-green-200 dark:border-green-700';
                 
                 const partialBadge = sol.isPartial
                    ? `<span class="ml-2 px-2 py-0.5 text-xs rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700">⚠️ 2/3 達標</span>`
                    : '';

                 let missingHint = '';
                 if (sol.isPartial && sol.missing) {
                    const missingParts = [];
                    if (sol.missing.missingP > 0) missingParts.push(`P -${sol.missing.missingP}`);
                    if (sol.missing.missingM > 0) missingParts.push(`M -${sol.missing.missingM}`);
                    if (sol.missing.missingT > 0) missingParts.push(`T -${sol.missing.missingT}`);
                    missingHint = `<div class="text-xs text-red-500 font-bold mt-1">缺少: ${missingParts.join(', ')}</div>`;
                 }

                 const finalP = sol.finalStats.p;
                 const finalM = sol.finalStats.m;
                 const finalT = sol.finalStats.t;
                 const rank = parseInt(document.getElementById('rank-selector').value);

                 html += `
                 <div class="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 ${borderColor} mb-6 shadow-sm relative overflow-hidden">
                     <button onclick="pinSolution(window._levelSolutions[${idx}], 'level')" class="absolute top-2 right-2 text-slate-400 hover:text-amber-500 transition-colors z-20" title="訂選此方案">
                         📌
                     </button>
                     ${sol.isChemCritical ? `<div class="absolute top-0 right-0 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-bl shadow z-10 border-b border-l border-rose-200 mr-8">⚠️ Chemistry Critical</div>` : ''}
                     
                     <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <div class="flex items-center gap-2">
                             <div class="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold">
                                 方案 #${idx + 1}
                             </div>
                             <div class="text-sm text-slate-700 dark:text-slate-300">
                                  全員等級 <span class="font-bold text-amber-600 dark:text-amber-400">+${sol.levelBoost}</span>
                                  ${partialBadge}
                             </div>
                        </div>
                        <div class="text-right flex flex-col gap-0.5">
                            <div class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                需求: P:${reqP} M:${reqM} T:${reqT}
                            </div>
                            <div class="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                總和: <span class="text-blue-600 dark:text-blue-400">P:${finalP} M:${finalM} T:${finalT}</span>
                            </div>
                            ${missingHint}
                        </div>
                     </div>
 
                     <div class="flex justify-center gap-2 mb-4 flex-wrap">
                        ${sol.squad.map(m => {
                            const chem = sol.activeChems ? sol.activeChems.find(c => c.memberId === m.id) : null;
                            let statLabel = "";
                            if (chem) {
                                if (chem.effect === 'stats_phy') statLabel = "P";
                                else if (chem.effect === 'stats_men') statLabel = "M";
                                else if (chem.effect === 'stats_tac') statLabel = "T";
                                else if (chem.effect === 'stats_all_phy') statLabel = "全P";
                                else if (chem.effect === 'stats_all_men') statLabel = "全M";
                                else if (chem.effect === 'stats_all_tac') statLabel = "全T";
                                else statLabel = "?";
                            }
                            return `
                            <div class="text-center p-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex flex-col items-center w-24 relative">
                                <div class="w-20 h-28 bg-slate-200 dark:bg-slate-600 rounded-md mb-1 overflow-hidden flex justify-center items-center shadow-sm relative">
                                    ${m.img ? `<img src="${m.img}" class="w-full h-full object-cover">` : `<span class="font-bold text-slate-500">${m.name.substring(0, 2)}</span>`}
                                    <img src="${CLASS_ICONS[m.cls]}" class="absolute bottom-1 right-1 w-6 h-6 drop-shadow-md z-10">
                                    ${chem ? `<div class="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[12px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm border-b border-l border-emerald-200 leading-none backdrop-blur-sm bg-opacity-90 z-20" title="Active: ${chem.reason || 'Condition Met'}">🍀</div>` : ''}
                                </div>
                                <div class="font-bold text-xs text-slate-800 dark:text-slate-200 truncate w-full">${(t.recruit_names && t.recruit_names[m.name]) || m.name}</div>
                                <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">${(t.class_names && (t.class_names[m.cls] || CLASS_NAMES_ZH[m.cls])) || m.cls} <span class="text-amber-600 dark:text-amber-400 font-bold">Lv${m.lvl}</span></div>
                                ${chem ? `<div class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 leading-none px-1 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 rounded">+${chem.val}% ${statLabel}</div>` : ''}
                            </div>
                        `}).join('')}
                    </div>

                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-4 text-sm border-l-4 ${sol.isPartial ? 'border-orange-300 dark:border-orange-600' : 'border-green-300 dark:border-green-600'}">
                        <h4 class="font-bold mb-2 text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">${t.msg_analysis.replace('{rank}', rank)}</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                                <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_base}</div>
                                <div class="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    <div class="grid grid-cols-3 gap-x-1">
                                        <span class="stat-phy">P:${sol.squad.reduce((a, b) => a + b.stats[0], 0)}</span>
                                        <span class="stat-men">M:${sol.squad.reduce((a, b) => a + b.stats[1], 0)}</span>
                                        <span class="stat-tac">T:${sol.squad.reduce((a, b) => a + b.stats[2], 0)}</span>
                                        ${sol.chemStats && (sol.chemStats.p > 0 || sol.chemStats.m > 0 || sol.chemStats.t > 0) ? `
                                            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.p > 0 ? `+${sol.chemStats.p}` : ''}</span>
                                            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.m > 0 ? `+${sol.chemStats.m}` : ''}</span>
                                            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.t > 0 ? `+${sol.chemStats.t}` : ''}</span>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_target_train}</div>
                                <div class="font-mono font-bold text-blue-600 dark:text-blue-400">
                                    <span class="stat-phy">P:${sol.finalStats.p}</span>
                                    <span class="stat-men">M:${sol.finalStats.m}</span>
                                    <span class="stat-tac">T:${sol.finalStats.t}</span>
                                </div>
                            </div>
                            <div class="col-span-2 md:col-span-2">
                                 <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_final_total}</div>
                                 <div class="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                                      <span class="stat-phy mr-2">P:${sol.finalStats.p + sol.squad.reduce((a, b) => a + b.stats[0], 0) + (sol.chemStats ? sol.chemStats.p : 0)}</span>
                                      <span class="stat-men mr-2">M:${sol.finalStats.m + sol.squad.reduce((a, b) => a + b.stats[1], 0) + (sol.chemStats ? sol.chemStats.m : 0)}</span>
                                      <span class="stat-tac">T:${sol.finalStats.t + sol.squad.reduce((a, b) => a + b.stats[2], 0) + (sol.chemStats ? sol.chemStats.t : 0)}</span>
                                 </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4 shadow-sm">
                        <h4 class="font-bold mb-3 text-blue-800 dark:text-blue-100 text-lg flex items-center gap-2">
                            <span class="text-xl">📋</span> ${t.msg_suggested_order}
                        </h4>
                        <div class="flex flex-col sm:flex-row flex-wrap gap-3">
                            ${sol.path.length > 0 ?
                        sol.path.map((opId, idx) => {
                            return `
                                <div class="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-sm shrink-0">${idx + 1}</span>
                                    <div class="flex items-center gap-3">
                                        ${(t.training_ops && t.training_ops[opId]) ?
                                    ((TRAINING_OPS.find(o => o.id === opId)?.img) ? `<img src="${TRAINING_OPS.find(o => o.id === opId).img}" class="w-8 h-8 object-contain">` : '') +
                                    `<span class="font-bold text-slate-800 dark:text-slate-100 text-base">${t.training_ops[opId]}</span>`
                                    : `<span class="font-bold text-slate-800 dark:text-slate-100 text-base">${opId}</span>`}
                                    </div>
                                </div>`;
                        }).join('') :
                        `<div class="text-green-600 dark:text-green-400 font-bold text-lg flex items-center gap-2">✅ ${t.msg_no_training_needed}</div>`
                    }
                        </div>
                    </div>

                 </div>`;
             });
             
             html += `<div class="text-center mt-6"><button onclick="calculate()" class="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg shadow transition-colors">${t.btn_back || '返回'}</button></div>`;
             
             resultContent.innerHTML = html;
         }

         // 模擬完成後設定資料為非最新，避免重複觸發
         window._dataIsFresh = false;


    }, 50);
}

/**
 * 轉職模擬函式
 * 模擬將隊員轉職為其他職業後，是否能讓隊伍達標
 */
function simulateJobChange() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    const resultSection = document.getElementById('result-section');
    const resultContent = document.getElementById('result-content-job');
    
    resultSection.classList.remove('hidden'); // Ensure visible
    switchResultTab('job'); // Activate Job tab

    // 檢查是否已有 100% 達標方案
    if (window._hasFullSolution) {
        resultContent.innerHTML = `
            <div class="bg-green-50 dark:bg-green-900/20 p-8 rounded-lg text-center border-2 border-green-200 dark:border-green-700">
                <div class="text-4xl mb-3">✅</div>
                <h3 class="text-green-700 dark:text-green-300 font-bold mb-2 text-lg">${t.msg_already_full || '方案已達標'}</h3>
                <p class="text-green-600 dark:text-green-400 mb-6">${t.msg_already_full_desc || '已找到 100% 達標方案，不需額外模擬。'}</p>
            </div>
        `;
        return;
    }

    if (!window._lastCalcParams) {
        resultContent.innerHTML = `<p class="text-red-600">${t.msg_error || '請先執行計算'}</p>`;
        return;
    }

    const { members, currTrain, reqP, reqM, reqT, affinities } = window._lastCalcParams;
    const rank = parseInt(document.getElementById('rank-selector').value);

    resultContent.innerHTML = `
        <div class="text-center py-8">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
            <p class="text-indigo-600 dark:text-indigo-400">${t.msg_simulating_job || '正在模擬轉職方案...'}</p>
        </div>
    `;

    setTimeout(() => {
        const start = performance.now();
        const suggestions = [];

        // --- OLD LOGIC COMMENTED OUT START ---
        /*
        const squads = getCombinations(members, 4);
        
        // Define all classes to try
        const ALL_CLASSES = ['GLA', 'MRD', 'CNJ', 'ACN', 'PGL', 'LNC', 'ROG', 'ARC', 'THM'];
        const getRole = (cls) => {
            if (['GLA', 'MRD'].includes(cls)) return 'class_tank';
            if (['CNJ'].includes(cls)) return 'class_healer';
            return 'class_dps';
        };

        // Try to change ONE member in each squad
        let checkedCount = 0;
        let bestPartial = null; // Track best partial solution

        // Calculate Baseline (Best Partial of current squads)
        let baselineTotalMissing = Infinity;
        for (const squad of squads) {
             const { bp, bm, bt } = calculateSquadStats(squad, affinities || []);
             const solution = solveTraining(bp, bm, bt, currTrain, reqP, reqM, reqT);
             if (!solution.success && solution.partialSuccess) {
                 const missing = solution.missing.missingP + solution.missing.missingM + solution.missing.missingT;
                 if (missing < baselineTotalMissing) baselineTotalMissing = missing;
             }
        }
        
        for (const squad of squads) {
            for (let i = 0; i < squad.length; i++) {
                // ... (old brute force on squad basis)
            }
            checkedCount++;
        }
        */
        // --- OLD LOGIC COMMENTED OUT END ---
        
        // --- NEW BRUTE FORCE LOGIC START ---
        // 1. Calculate Baseline from current roster (before any change)
        const currentSquads = getCombinations(members, 4);
        let baselineTotalMissing = Infinity;
        
        for (const squad of currentSquads) {
             const { bp, bm, bt } = calculateSquadStats(squad, affinities || []);
             const solution = solveTraining(bp, bm, bt, currTrain, reqP, reqM, reqT);
             if (solution.success) {
                 baselineTotalMissing = 0; // Already have a perfect solution
                 break; 
             } else if (solution.partialSuccess) {
                 const missing = solution.missing.missingP + solution.missing.missingM + solution.missing.missingT;
                 if (missing < baselineTotalMissing) baselineTotalMissing = missing;
             }
        }
        
        console.log("Baseline Missing:", baselineTotalMissing);

        // Constants
        const ALL_CLASSES = ['GLA', 'MRD', 'CNJ', 'ACN', 'PGL', 'LNC', 'ROG', 'ARC', 'THM'];
        const getRole = (cls) => {
            if (['GLA', 'MRD'].includes(cls)) return 'class_tank';
            if (['CNJ'].includes(cls)) return 'class_healer';
            return 'class_dps';
        };

        // 2. Iterate every member in the full list
        for (let i = 0; i < members.length; i++) {
            const targetMember = members[i];
            const otherMembers = members.filter(m => m.id !== targetMember.id);
            
            // 3. Try every class change
            for (const newClass of ALL_CLASSES) {
                if (newClass === targetMember.cls) continue; // Skip same class

                // Create modified member object
                const newStats = getStats(newClass, targetMember.lvl);
                const modifiedMember = {
                    ...targetMember,
                    cls: newClass,
                    stats: newStats,
                    role: getRole(newClass),
                    isChanged: true,
                    oldCls: targetMember.cls
                };

                // 4. Form squads: Modified Member + Any 3 from otherMembers
                const otherCombinations = getCombinations(otherMembers, 3);
                
                for (const others of otherCombinations) {
                    const testSquad = [modifiedMember, ...others];
                    
                    // Calc stats
                    const { bp, bm, bt, chemStats, activeChems } = calculateSquadStats(testSquad, affinities || []);
                    const solution = solveTraining(bp, bm, bt, currTrain, reqP, reqM, reqT);
                    
                    // Filter Logic
                    let isValid = false;
                    let isChemCritical = false;

                    if (solution.success) {
                        isValid = true;
                        // Check Chem Critical
                        if (chemStats.p > 0 && (solution.finalStats.p - chemStats.p < reqP)) isChemCritical = true;
                        if (chemStats.m > 0 && (solution.finalStats.m - chemStats.m < reqM)) isChemCritical = true;
                        if (chemStats.t > 0 && (solution.finalStats.t - chemStats.t < reqT)) isChemCritical = true;
                    } else if (solution.partialSuccess) {
                        const totalMissing = solution.missing.missingP + solution.missing.missingM + solution.missing.missingT;
                        // Strictly better than baseline
                        if (totalMissing < baselineTotalMissing) {
                            isValid = true;
                        }
                    }

                    if (isValid) {
                         const currentResult = {
                            squad: testSquad,
                            steps: solution.path.length,
                            path: solution.path,
                            changedMemberId: targetMember.id,
                            newClass: newClass,
                            oldClass: targetMember.cls,
                            finalStats: solution.finalStats,
                            chemStats,
                            activeChems,
                            isChemCritical: isChemCritical,
                            isPartial: !solution.success,
                            missing: solution.missing,
                            totalMissing: !solution.success ? (solution.missing.missingP + solution.missing.missingM + solution.missing.missingT) : 0
                        };
                        suggestions.push(currentResult);
                    }
                }
            }
        }

        // 5. Sort & Unique & Top 2
        // Sort: Success First -> Min Missing -> Min Steps
        suggestions.sort((a, b) => {
            if (a.isPartial !== b.isPartial) return a.isPartial ? 1 : -1; // Success first
            if (a.isPartial) {
                if (a.totalMissing !== b.totalMissing) return a.totalMissing - b.totalMissing;
            }
            return a.steps - b.steps;
        });

        // Filter duplicates (same squad composition and same job change typically identical, but just keep simple unique or top)
        // Since we want top 2 distinct solutions, we can just slice.
        // Optional: Filter to ensure we don't show identical squad suggestion twice if multiple paths exist (but solveTraining returns one path)
        
        const topSuggestions = suggestions.slice(0, 2);
        
        // Store solutions in global for pinning
        window._jobSolutions = topSuggestions;
        
        // --- NEW LOGIC END ---

        if (topSuggestions.length === 0) {
            resultContent.innerHTML = `
                 <div class="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg text-center">
                    <p class="text-slate-600 dark:text-slate-400 mb-2">${t.msg_no_suggestions || '模擬結束，未發現可行的單人轉職方案。'}</p>
                    <button onclick="calculate()" class="text-blue-500 hover:text-blue-600 underline text-sm">${t.btn_back || '返回計算'}</button>
                </div>
            `;
        } else {
             let html = `<div class="mb-4 text-center font-bold text-indigo-600 dark:text-indigo-400 text-lg">💡 ${t.msg_job_suggestions || '轉職建議 (Job Change Suggestions)'}</div>`;
             
             topSuggestions.forEach((sol, idx) => {
                 const changedMember = sol.squad.find(m => m.isChanged);
                 const mName = (t.recruit_names && t.recruit_names[changedMember.name]) || changedMember.name;
                 const oldCName = (t.class_names && t.class_names[sol.oldClass]) || sol.oldClass;
                 const newCName = (t.class_names && t.class_names[sol.newClass]) || sol.newClass;
                 
                 // Stats Analysis preparation
                 const borderColor = sol.isPartial
                     ? 'border-orange-300 dark:border-orange-600'
                     : 'border-green-200 dark:border-green-700';
                 
                 const partialBadge = sol.isPartial
                    ? `<span class="ml-2 px-2 py-0.5 text-xs rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700">⚠️ 2/3 達標</span>`
                    : '';

                 let missingHint = '';
                 if (sol.isPartial && sol.missing) {
                    const missingParts = [];
                    if (sol.missing.missingP > 0) missingParts.push(`P -${sol.missing.missingP}`);
                    if (sol.missing.missingM > 0) missingParts.push(`M -${sol.missing.missingM}`);
                    if (sol.missing.missingT > 0) missingParts.push(`T -${sol.missing.missingT}`);
                    missingHint = `<div class="text-xs text-red-500 font-bold mt-1">缺少: ${missingParts.join(', ')}</div>`;
                 }

                 const finalP = sol.finalStats.p;
                 const finalM = sol.finalStats.m;
                 const finalT = sol.finalStats.t;
                 const rank = parseInt(document.getElementById('rank-selector').value);

                 html += `
                 <div class="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 mb-6 shadow-sm relative overflow-hidden">
                     <button onclick="pinSolution(window._jobSolutions[${idx}], 'job')" class="absolute top-2 right-2 text-slate-400 hover:text-amber-500 transition-colors z-20" title="訂選此方案">
                         📌
                     </button>
                     ${sol.isChemCritical ? `<div class="absolute top-0 right-0 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-bl shadow z-10 border-b border-l border-rose-200 mr-8">⚠️ Chemistry Critical</div>` : ''}
                     
                     <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2 pr-8">
                        <div class="flex items-center gap-2">
                             <div class="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
                                 方案 #${idx + 1}
                             </div>
                             <div class="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1 flex-wrap">
                                  將 <span class="font-bold">${mName}</span> 從 
                                  <img src="${CLASS_ICONS[sol.oldClass]}" class="inline w-4 h-4">${oldCName} 
                                  轉職為 
                                  <img src="${CLASS_ICONS[sol.newClass]}" class="inline w-4 h-4"><span class="font-bold text-indigo-600 dark:text-indigo-400">${newCName}</span>
                                  ${partialBadge}
                             </div>
                        </div>
                        <div class="text-right flex flex-col gap-0.5">
                            <div class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                需求: P:${reqP} M:${reqM} T:${reqT}
                            </div>
                            ${missingHint}
                        </div>
                     </div>
 
                     <div class="flex justify-center gap-2 mb-4 flex-wrap">
                        ${sol.squad.map(m => {
                            const chem = sol.activeChems ? sol.activeChems.find(c => c.memberId === m.id) : null;
                            let statLabel = "";
                            if (chem) {
                                if (chem.effect === 'stats_phy') statLabel = "P";
                                else if (chem.effect === 'stats_men') statLabel = "M";
                                else if (chem.effect === 'stats_tac') statLabel = "T";
                                else if (chem.effect === 'stats_all_phy') statLabel = "全P";
                                else if (chem.effect === 'stats_all_men') statLabel = "全M";
                                else if (chem.effect === 'stats_all_tac') statLabel = "全T";
                                else statLabel = "?";
                            }
                            return `
                            <div class="text-center p-2 ${m.isChanged ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'bg-slate-50 dark:bg-slate-700 border-slate-200'} rounded-lg border flex flex-col items-center w-24 relative">
                                <div class="w-20 h-28 bg-slate-200 dark:bg-slate-600 rounded-md mb-1 overflow-hidden flex justify-center items-center shadow-sm relative">
                                    ${m.img ? `<img src="${m.img}" class="w-full h-full object-cover">` : `<span class="font-bold text-slate-500">${m.name.substring(0, 2)}</span>`}
                                    <img src="${CLASS_ICONS[m.cls]}" class="absolute bottom-1 right-1 w-6 h-6 drop-shadow-md z-10">
                                    ${m.isChanged ? `<div class="absolute inset-0 bg-indigo-500/20 flex items-center justify-center font-bold text-white text-lg drop-shadow shadow-black z-20">NEW</div>` : ''}
                                    ${chem ? `<div class="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[12px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm border-b border-l border-emerald-200 leading-none backdrop-blur-sm bg-opacity-90 z-20" title="Active: ${chem.reason || 'Condition Met'}">🍀</div>` : ''}
                                </div>
                                <div class="font-bold text-xs text-slate-800 dark:text-slate-200 truncate w-full">${(t.recruit_names && t.recruit_names[m.name]) || m.name}</div>
                                <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">${(t.class_names && (t.class_names[m.cls] || CLASS_NAMES_ZH[m.cls])) || m.cls} Lv${m.lvl}</div>
                                ${chem ? `<div class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 leading-none px-1 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 rounded">+${chem.val}% ${statLabel}</div>` : ''}
                            </div>
                        `}).join('')}
                    </div>

                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-4 text-sm border-l-4 border-indigo-300 dark:border-indigo-600">
                        <h4 class="font-bold mb-2 text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">${t.msg_analysis.replace('{rank}', rank)}</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                                <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_base}</div>
                                <div class="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    <div class="grid grid-cols-3 gap-x-1">
                                        <span class="stat-phy">P:${sol.squad.reduce((a, b) => a + b.stats[0], 0)}</span>
                                        <span class="stat-men">M:${sol.squad.reduce((a, b) => a + b.stats[1], 0)}</span>
                                        <span class="stat-tac">T:${sol.squad.reduce((a, b) => a + b.stats[2], 0)}</span>
                                        
                                        ${sol.chemStats && (sol.chemStats.p > 0 || sol.chemStats.m > 0 || sol.chemStats.t > 0) ? `
                                            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.p > 0 ? `+${sol.chemStats.p}` : ''}</span>
                                            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.m > 0 ? `+${sol.chemStats.m}` : ''}</span>
                                            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.t > 0 ? `+${sol.chemStats.t}` : ''}</span>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_target_train}</div>
                                <div class="font-mono font-bold text-blue-600 dark:text-blue-400">
                                    <span class="stat-phy">P:${sol.finalStats.p}</span>
                                    <span class="stat-men">M:${sol.finalStats.m}</span>
                                    <span class="stat-tac">T:${sol.finalStats.t}</span>
                                </div>
                            </div>
                            <div class="col-span-2 md:col-span-2">
                                 <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_final_total}</div>
                                 <div class="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                                      <span class="stat-phy mr-2">P:${sol.finalStats.p + sol.squad.reduce((a, b) => a + b.stats[0], 0) + (sol.chemStats ? sol.chemStats.p : 0)}</span>
                                      <span class="stat-men mr-2">M:${sol.finalStats.m + sol.squad.reduce((a, b) => a + b.stats[1], 0) + (sol.chemStats ? sol.chemStats.m : 0)}</span>
                                      <span class="stat-tac">T:${sol.finalStats.t + sol.squad.reduce((a, b) => a + b.stats[2], 0) + (sol.chemStats ? sol.chemStats.t : 0)}</span>
                                 </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4 shadow-sm">
                        <h4 class="font-bold mb-3 text-blue-800 dark:text-blue-100 text-lg flex items-center gap-2">
                            <span class="text-xl">📋</span> ${t.msg_suggested_order}
                        </h4>
                        <div class="flex flex-col sm:flex-row flex-wrap gap-3">
                            ${sol.path.length > 0 ?
                        sol.path.map((opId, idx) => {
                            return `
                                <div class="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-sm shrink-0">${idx + 1}</span>
                                    <div class="flex items-center gap-3">
                                        ${(t.training_ops && t.training_ops[opId]) ?
                                    ((TRAINING_OPS.find(o => o.id === opId)?.img) ? `<img src="${TRAINING_OPS.find(o => o.id === opId).img}" class="w-8 h-8 object-contain">` : '') +
                                    `<span class="font-bold text-slate-800 dark:text-slate-100 text-base">${t.training_ops[opId]}</span>`
                                    : `<span class="font-bold text-slate-800 dark:text-slate-100 text-base">${opId}</span>`}
                                    </div>
                                </div>`;
                        }).join('') :
                        `<div class="text-green-600 dark:text-green-400 font-bold text-lg flex items-center gap-2">✅ ${t.msg_no_training_needed}</div>`
                    }
                        </div>
                    </div>

                 </div>`;
             });
             
             html += `<div class="text-center mt-6"><button onclick="calculate()" class="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg shadow transition-colors">${t.btn_back || '返回'}</button></div>`;
             
             resultContent.innerHTML = html;
        }

        // 模擬完成後設定資料為非最新，避免重複觸發
        window._dataIsFresh = false;

    }, 50);
}

/**
 * 計算單次訓練後的屬性結果 (包含溢出與倒扣邏輯)
 * @param {number} p - 目前 P
 * @param {number} m - 目前 M
 * @param {number} t - 目前 T
 * @param {string} opId - 訓練項目 ID
 * @param {number} cap - 屬性池上限
 * @returns {Object} { p, m, t } 新的屬性
 */
function calculateTrainingResult(p, m, t, opId, cap) {
    const op = TRAINING_OPS.find(o => o.id === opId);
    if (!op) return { p, m, t, isValid: false };

    // Strict Constraint: Cannot reduce a stat below 0
    // Note: This applies regardless of whether we are at the cap or not.
    if (p + op.cost[0] < 0 || m + op.cost[1] < 0 || t + op.cost[2] < 0) {
        return { p, m, t, isValid: false };
    }

    const currentSum = p + m + t;
    let nextP, nextM, nextT;

    // 遊戲機制：素質未滿時只加不減，已滿時完整套用訓練效果
    if (currentSum < cap) {
        // 未滿：只加正數部分
        nextP = p + Math.max(0, op.cost[0]);
        nextM = m + Math.max(0, op.cost[1]);
        nextT = t + Math.max(0, op.cost[2]);
    } else {
        // 已滿：維持總和 (Spillover Logic)
        // Since the initial check ensures no stat goes below 0, and all TRAINING_OPS costs sum to 0,
        // applying the costs directly will maintain the sum at 'cap'.
        nextP = p + op.cost[0];
        nextM = m + op.cost[1];
        nextT = t + op.cost[2];
    }

    return { p: nextP, m: nextM, t: nextT, isValid: true };
}

/**
 * 訓練路徑求解函式 (BFS)
 * @param {number} baseP - 基礎 P 屬性
 * @param {number} baseM - 基礎 M 屬性
 * @param {number} baseT - 基礎 T 屬性
 * @param {number[]} currTrain - 目前訓練數值 [P, M, T]
 * @param {number} reqP - 需求 P
 * @param {number} reqM - 需求 M
 * @param {number} reqT - 需求 T
 * @returns {Object} 解結果
 */
function solveTraining(baseP, baseM, baseT, currTrain, reqP, reqM, reqT) {
    // 取得目前 Rank 的素質上限
    const rank = parseInt(document.getElementById('rank-selector').value);
    const cap = RANK_CAPS[rank];

    // 檢查是否達標的輔助函式
    const checkMatch = (p, m, t) => {
        const matchP = (baseP + p) >= reqP;
        const matchM = (baseM + m) >= reqM;
        const matchT = (baseT + t) >= reqT;
        const matchCount = (matchP ? 1 : 0) + (matchM ? 1 : 0) + (matchT ? 1 : 0);
        return { matchP, matchM, matchT, matchCount };
    };

    // 計算缺少多少屬性
    const calcMissing = (p, m, t) => {
        return {
            missingP: Math.max(0, reqP - (baseP + p)),
            missingM: Math.max(0, reqM - (baseM + m)),
            missingT: Math.max(0, reqT - (baseT + t))
        };
    };

    // Initial State
    const startState = {
        p: currTrain[0],
        m: currTrain[1],
        t: currTrain[2],
        path: []
    };

    // Check if initial state works (3/3)
    const initCheck = checkMatch(startState.p, startState.m, startState.t);
    if (initCheck.matchCount === 3) {
        return { success: true, partialSuccess: false, path: [], finalStats: startState, matchedStats: [true, true, true] };
    }

    const queue = [startState];
    const visited = new Set();
    visited.add(`${startState.p},${startState.m},${startState.t}`);

    let maxDepth = 9; // Max trainings
    let bestPartial = null; // 儲存最佳的 2/3 達標解

    // 檢查初始狀態是否為 2/3
    if (initCheck.matchCount === 2) {
        const missing = calcMissing(startState.p, startState.m, startState.t);
        bestPartial = {
            path: [],
            finalStats: startState,
            matchedStats: [initCheck.matchP, initCheck.matchM, initCheck.matchT],
            missing,
            steps: 0
        };
    }

    while (queue.length > 0) {
        const current = queue.shift();
        if (current.path.length >= maxDepth) continue;

        // Try all 6 training ops
        for (let op of TRAINING_OPS) {

            const result = calculateTrainingResult(current.p, current.m, current.t, op.id, cap);
            const nextP = result.p;
            const nextM = result.m;
            const nextT = result.t;

            // 素質不可超過上限，總和也不可超過上限
            if (nextP > cap || nextM > cap || nextT > cap) continue;
            const nextSum = nextP + nextM + nextT;

            // 注意：這裡我們允許浮點數誤差範圍內的比較，或是整數運算
            if (nextSum > cap) continue;

            const stateKey = `${nextP},${nextM},${nextT}`;
            if (visited.has(stateKey)) continue;

            const nextState = {
                p: nextP, m: nextM, t: nextT,
                path: [...current.path, op.id]
            };

            const check = checkMatch(nextP, nextM, nextT);

            // 3/3 完全達標 - 立即回傳
            if (check.matchCount === 3) {
                return {
                    success: true,
                    partialSuccess: false,
                    path: nextState.path,
                    finalStats: nextState,
                    matchedStats: [true, true, true]
                };
            }

            // 2/3 部分達標 - 記錄最佳解（步數最少）
            if (check.matchCount === 2) {
                const missing = calcMissing(nextP, nextM, nextT);
                const totalMissing = missing.missingP + missing.missingM + missing.missingT;

                if (!bestPartial ||
                    nextState.path.length < bestPartial.steps ||
                    (nextState.path.length === bestPartial.steps &&
                        totalMissing < (bestPartial.missing.missingP + bestPartial.missing.missingM + bestPartial.missing.missingT))) {
                    bestPartial = {
                        path: nextState.path,
                        finalStats: nextState,
                        matchedStats: [check.matchP, check.matchM, check.matchT],
                        missing,
                        steps: nextState.path.length
                    };
                }
            }

            visited.add(stateKey);
            queue.push(nextState);
        }
    }

    // 沒有 3/3 解，回傳 2/3 解（如果有的話）
    if (bestPartial) {
        return {
            success: false,
            partialSuccess: true,
            path: bestPartial.path,
            finalStats: bestPartial.finalStats,
            matchedStats: bestPartial.matchedStats,
            missing: bestPartial.missing
        };
    }

    return { success: false, partialSuccess: false };
}

/**
 * 主計算函式
 * 計算最佳隊員配置和訓練路徑
 */
function calculate() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    const resultSection = document.getElementById('result-section');
    const resultContent = document.getElementById('result-content');
    resultSection.classList.remove('hidden'); // Show result section
    switchResultTab('general'); // Activate General tab
    
    // 計算執行時設定資料為最新，讓 tab 切換時可以自動執行模擬
    window._dataIsFresh = true;
    resultContent.innerHTML = t.msg_calculating;

    // Check if sum matches rank
    if (!validateSum()) {
        resultContent.innerHTML = `<h3 class="text-red-700 dark:text-red-400 font-bold mb-2">${t.msg_error_sum}</h3><p>${t.msg_error_sum_desc}</p>`;
        return;
    }

    const reqP = parseInt(document.getElementById('req-p').value);
    const reqM = parseInt(document.getElementById('req-m').value);
    const reqT = parseInt(document.getElementById('req-t').value);

    const currTrain = [
        parseInt(document.getElementById('curr-p').value),
        parseInt(document.getElementById('curr-m').value),
        parseInt(document.getElementById('curr-t').value)
    ];

    // Gather Members (Only Active Ones)
    const members = [];
    const affinities = [
        document.getElementById('mission-affinity-1').value,
        document.getElementById('mission-affinity-2').value,
        document.getElementById('mission-affinity-3').value
    ].filter(v => v);

    // Class to Role Mapping
    const getRole = (cls) => {
        if (['GLA', 'MRD'].includes(cls)) return 'class_tank';
        if (['CNJ'].includes(cls)) return 'class_healer'; // ACN in Squadron is usually DPS
        return 'class_dps';
    };

    for (let i = 0; i < 8; i++) {
        const isActive = document.getElementById(`active-${i}`).checked;
        if (!isActive) continue;

        const nameInput = document.getElementById(`name-${i}`);
        const name = nameInput.dataset.recruitId || nameInput.value;
        const cls = document.getElementById(`class-${i}`).value;
        const lvl = parseInt(document.getElementById(`lvl-${i}`).value);
        const rData = RECRUIT_DATA.find(r => r.name === name);
        
        // Chemistry Data
        const chemCond = document.getElementById(`chem-cond-${i}`).value;
        const chemEffect = document.getElementById(`chem-effect-${i}`).value;
        const chemVal = parseInt(document.getElementById(`chem-val-${i}`).value) || 0;

        members.push({
            id: i, name, cls, lvl, stats: getStats(cls, lvl),
            img: rData ? rData.img : null,
            race: rData ? rData.race : null,
            gender: rData ? (`gender_${rData.gender.toLowerCase()}`) : null, // gender_male / gender_female
            role: getRole(cls),
            chem: { cond: chemCond, effect: chemEffect, val: chemVal }
        });
    }

    if (members.length < 4) {
        resultContent.innerHTML = `<h3 class="text-red-700 dark:text-red-400 font-bold mb-2">${t.msg_error_min_members}</h3><p>${t.msg_error_min_members_desc}</p>`;
        return;
    }

    const squads = getCombinations(members, 4);
    let solutions = [];

    squads.forEach(squad => {
        // Use Helper
        const { bp, bm, bt, chemStats, activeChems } = calculateSquadStats(squad, affinities);

        const solution = solveTraining(bp, bm, bt, currTrain, reqP, reqM, reqT);

        if (solution.success) {
            solutions.push({
                squad: squad,
                steps: solution.path.length,
                path: solution.path,
                finalStats: solution.finalStats,
                isPartial: false,
                chemStats,
                activeChems // Pass to result
            });
        } else if (solution.partialSuccess) {
            const totalMissing = solution.missing.missingP + solution.missing.missingM + solution.missing.missingT;
            solutions.push({
                squad: squad,
                steps: solution.path.length,
                path: solution.path,
                finalStats: solution.finalStats,
                isPartial: true,
                matchedStats: solution.matchedStats,
                missing: solution.missing,
                totalMissing: totalMissing, // 用於激進策略排序
                chemStats,
                activeChems // Pass to result
            });
        }
    });

    // 分離 100% 達標和 2/3 達標的結果
    const fullSolutions = solutions.filter(s => !s.isPartial);
    const partialSolutions = solutions.filter(s => s.isPartial);

    // 優先顯示 100% 達標，若無則顯示 2/3 達標
    let displaySolutions;
    let isShowingPartial = false;

    if (fullSolutions.length > 0) {
        displaySolutions = fullSolutions;
        window._hasFullSolution = true; // 有 100% 達標方案
        window._lastCalcParams = { members, currTrain, reqP, reqM, reqT, affinities }; // 儲存計算參數
    } else if (partialSolutions.length > 0) {
        displaySolutions = partialSolutions;
        isShowingPartial = true;
        window._hasFullSolution = false; // 沒有 100% 達標方案
        window._lastCalcParams = { members, currTrain, reqP, reqM, reqT, affinities }; // 儲存計算參數
    } else {
        // 完全無解 - 顯示簡易提示 + 進階模擬按鈕
        resultContent.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
                <h3 class="text-red-700 dark:text-red-400 font-bold mb-2 text-lg">${t.msg_impossible}</h3>
                <p class="text-red-600 dark:text-red-300 mb-4">${t.msg_impossible_desc}</p>
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-4 flex flex-col md:flex-row gap-4 justify-center items-center">
                    <div>
                         <p class="text-amber-700 dark:text-amber-300 font-bold mb-1">${t.msg_sim_options || '🔍 模擬選項 (Simulation Options)'}</p>
                         <p class="text-xs text-amber-600 dark:text-amber-400 opacity-80">${t.msg_sim_desc || '嘗試尋找可行的替代方案，請點擊上方分頁'}</p>
                    </div>
                    <!-- 按鈕已移除，改為透過 Tab 切換自動觸發模擬 -->
                </div>
            </div>
        `;
        window._lastCalcParams = { members, currTrain, reqP, reqM, reqT, affinities }; // Save affinities too
        window._hasFullSolution = false; // 沒有 100% 達標方案
        return;
    }

    // Sort: 
    // - Full solutions: by steps (asc)
    // - Partial solutions: by totalMissing (asc) FIRST, then steps (激進策略)
    displaySolutions.sort((a, b) => {
        if (a.isPartial && b.isPartial) {
            // 激進策略：缺少值越低越好，優先於步數
            if (a.totalMissing !== b.totalMissing) return a.totalMissing - b.totalMissing;
            return a.steps - b.steps;
        }
        // Full solutions: by steps
        return a.steps - b.steps;
    });

    // Take top 8
    const bestSolutions = displaySolutions.slice(0, 8);
    const rank = parseInt(document.getElementById('rank-selector').value);

    // Store solutions in global for pinning
    window._generalSolutions = bestSolutions;

    // Render Result
    const headerColor = isShowingPartial ? 'text-orange-600 dark:text-orange-400' : 'text-green-700 dark:text-green-400';
    const headerText = isShowingPartial
        ? (t.msg_partial_found || `⚠️ 找到 ${bestSolutions.length} 個部分達標方案 (2/3)`).replace('{count}', bestSolutions.length)
        : (t.msg_found || `Found ${bestSolutions.length} options:`).replace('{count}', bestSolutions.length);
    let html = `<div class="mb-4 text-center font-bold ${headerColor} text-lg">${headerText}</div>`;

    bestSolutions.forEach((sol, idx) => {
        const borderColor = sol.isPartial
            ? 'border-orange-300 dark:border-orange-600'
            : 'border-green-200 dark:border-green-700';

        const partialBadge = sol.isPartial
            ? `<span class="ml-2 px-2 py-0.5 text-xs rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700">⚠️ 2/3 達標</span>`
            : '';

        let missingHint = '';
        if (sol.isPartial && sol.missing) {
            const missingParts = [];
            if (sol.missing.missingP > 0) missingParts.push(`P -${sol.missing.missingP}`);
            if (sol.missing.missingM > 0) missingParts.push(`M -${sol.missing.missingM}`);
            if (sol.missing.missingT > 0) missingParts.push(`T -${sol.missing.missingT}`);
            missingHint = `<div class="text-orange-600 dark:text-orange-400 text-xs mt-1">缺少: ${missingParts.join(', ')}</div>`;
        }

        html += `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 ${borderColor} mb-6 shadow-sm relative">
            <button onclick="pinSolution(window._generalSolutions[${idx}], 'general')" class="absolute top-2 right-2 text-slate-400 hover:text-amber-500 transition-colors" title="訂選此方案">
                📌
            </button>
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                <div class="flex items-center gap-2">
                        <div class="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
                            方案 #${idx + 1}
                        </div>
                        <div class="text-sm text-slate-700 dark:text-slate-300 font-bold">
                            ${t.msg_success_found.replace('{steps}', sol.steps)}${partialBadge}
                        </div>
                </div>
                <div class="text-right flex flex-col gap-0.5 mr-6">
                     <div class="text-xs font-normal text-slate-500">${t.msg_req.replace('{reqP}', reqP).replace('{reqM}', reqM).replace('{reqT}', reqT)}</div>
                     ${missingHint}
                </div>
            </div>
            
            <div class="flex justify-center gap-2 mb-4 flex-wrap">
                ${sol.squad.map(m => {
                    const chem = sol.activeChems ? sol.activeChems.find(c => c.memberId === m.id) : null;
                    let statLabel = "";
                    if (chem) {
                        if (chem.effect === 'stats_phy') statLabel = "P";
                        else if (chem.effect === 'stats_men') statLabel = "M";
                        else if (chem.effect === 'stats_tac') statLabel = "T";
                        else if (chem.effect === 'stats_all_phy') statLabel = "全P";
                        else if (chem.effect === 'stats_all_men') statLabel = "全M";
                        else if (chem.effect === 'stats_all_tac') statLabel = "全T";
                        else statLabel = "?";
                    }
                    return `
                    <div class="text-center p-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex flex-col items-center w-24 relative">
                        <div class="w-20 h-28 bg-slate-200 dark:bg-slate-600 rounded-md mb-1 overflow-hidden flex justify-center items-center shadow-sm border border-slate-300 dark:border-slate-500 relative">
                            ${m.img ? `<img src="${m.img}" class="w-full h-full object-cover">` : `<span class="font-bold text-slate-500">${m.name.substring(0, 2)}</span>`}
                            <img src="${CLASS_ICONS[m.cls]}" class="absolute bottom-1 right-1 w-6 h-6 drop-shadow-md z-10" title="${(t.class_names && t.class_names[m.cls]) || m.cls}">
                            ${chem ? `<div class="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[12px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm border-b border-l border-emerald-200 leading-none backdrop-blur-sm bg-opacity-90" title="Active: ${chem.reason || 'Condition Met'}">🍀</div>` : ''}
                        </div>
                        <div class="font-bold text-xs text-slate-800 dark:text-slate-200 truncate w-full">${(t.recruit_names && t.recruit_names[m.name]) || m.name}</div>
                        <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">${(t.class_names && t.class_names[m.cls]) || m.cls} Lv${m.lvl}</div>
                        ${chem ? `<div class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 leading-none px-1 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 rounded">+${chem.val}% ${statLabel}</div>` : ''}
                    </div>
                `}).join('')}
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-4 text-sm border-l-4 border-slate-300 dark:border-slate-600">
                <h4 class="font-bold mb-2 text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">${t.msg_analysis.replace('{rank}', rank)}</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                        <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_base}</div>
                        <div class="font-mono font-bold text-slate-700 dark:text-slate-300">
                            <div class="grid grid-cols-3 gap-x-1">
                                <span class="stat-phy">P:${sol.squad.reduce((a, b) => a + b.stats[0], 0)}</span>
                                <span class="stat-men">M:${sol.squad.reduce((a, b) => a + b.stats[1], 0)}</span>
                                <span class="stat-tac">T:${sol.squad.reduce((a, b) => a + b.stats[2], 0)}</span>
                                
                                ${sol.chemStats && (sol.chemStats.p > 0 || sol.chemStats.m > 0 || sol.chemStats.t > 0) ? `
                                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.p > 0 ? `+${sol.chemStats.p}` : ''}</span>
                                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.m > 0 ? `+${sol.chemStats.m}` : ''}</span>
                                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 self-start">${sol.chemStats.t > 0 ? `+${sol.chemStats.t}` : ''}</span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_target_train}</div>
                        <div class="font-mono font-bold text-blue-600 dark:text-blue-400">
                            <span class="stat-phy">P:${sol.finalStats.p}</span>
                            <span class="stat-men">M:${sol.finalStats.m}</span>
                            <span class="stat-tac">T:${sol.finalStats.t}</span>
                        </div>
                    </div>
                    <div class="col-span-2 md:col-span-2">
                         <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_final_total}</div>
                         <div class="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                              <span class="stat-phy mr-2">P:${sol.finalStats.p + sol.squad.reduce((a, b) => a + b.stats[0], 0) + (sol.chemStats ? sol.chemStats.p : 0)}</span>
                              <span class="stat-men mr-2">M:${sol.finalStats.m + sol.squad.reduce((a, b) => a + b.stats[1], 0) + (sol.chemStats ? sol.chemStats.m : 0)}</span>
                              <span class="stat-tac">T:${sol.finalStats.t + sol.squad.reduce((a, b) => a + b.stats[2], 0) + (sol.chemStats ? sol.chemStats.t : 0)}</span>
                         </div>
                    </div>
                </div>
            </div>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4 shadow-sm">
                <h4 class="font-bold mb-3 text-blue-800 dark:text-blue-100 text-lg flex items-center gap-2">
                    <span class="text-xl">📋</span> ${t.msg_suggested_order}
                </h4>
                <div class="flex flex-col sm:flex-row flex-wrap gap-3">
                    ${sol.path.length > 0 ?
                sol.path.map((opId, idx) => {
                    return `
                        <div class="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-sm shrink-0">${idx + 1}</span>
                            <div class="flex items-center gap-3">
                                ${(t.training_ops && t.training_ops[opId]) ?
                            ((TRAINING_OPS.find(o => o.id === opId)?.img) ? `<img src="${TRAINING_OPS.find(o => o.id === opId).img}" class="w-8 h-8 object-contain">` : '') +
                            `<span class="font-bold text-slate-800 dark:text-slate-100 text-base">${t.training_ops[opId]}</span>`
                            : `<span class="font-bold text-slate-800 dark:text-slate-100 text-base">${opId}</span>`}
                            </div>
                        </div>`;
                }).join('') :
                `<div class="text-green-600 dark:text-green-400 font-bold text-lg flex items-center gap-2">✅ ${t.msg_no_training_needed}</div>`
            }
                </div>
            </div>
        </div>
        `;
    });

    // 如果是顯示部分達標結果，在結果最後加入等級模擬按鈕
    if (isShowingPartial) {
        html += `
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-4 flex flex-col md:flex-row gap-4 justify-center items-center">
                <div>
                     <p class="text-amber-700 dark:text-amber-300 font-bold mb-1">${t.msg_sim_options || '🔍 模擬選項 (Simulation Options)'}</p>
                     <p class="text-xs text-amber-600 dark:text-amber-400 opacity-80">${t.msg_sim_desc || '嘗試尋找可行的替代方案，請點擊上方分頁'}</p>
                </div>
                <!-- 按鈕已移除，改為透過 Tab 切換自動觸發模擬 -->
                <!-- <div class="flex gap-2">
                    <button onclick="simulateLevelUp()" 
                        class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow transition-colors text-sm">
                        ${t.btn_simulate_level || '能夠透過升級解決嗎？'}
                    </button>
                    <button onclick="simulateJobChange()" 
                        class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg shadow transition-colors text-sm">
                        ${t.btn_simulate_job || '能夠透過轉職解決嗎？'}
                    </button>
                </div> -->
        `;
        // 儲存計算參數供模擬使用
        window._lastCalcParams = { members, currTrain, reqP, reqM, reqT, affinities };
    }

    resultContent.innerHTML = html;
    saveSquadronData();
}
