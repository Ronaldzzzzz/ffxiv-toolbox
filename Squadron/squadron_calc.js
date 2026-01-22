// Squadron Calculator - Calculation Logic
// 運算邏輯獨立檔案

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
 * 等級提升模擬函式
 * 模擬隊員升級後是否能達成任務需求
 */
function simulateLevelUp() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-TW'];
    const resultContent = document.getElementById('result-content');

    if (!window._lastCalcParams) {
        resultContent.innerHTML = `<p class="text-red-600">${t.msg_error || '請先執行計算'}</p>`;
        return;
    }

    const { members, currTrain, reqP, reqM, reqT } = window._lastCalcParams;
    const rank = parseInt(document.getElementById('rank-selector').value);
    const cap = RANK_CAPS[rank];

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

        // 嘗試不同的等級增量 (1-20)
        for (let levelBoost = 1; levelBoost <= 20; levelBoost++) {
            let foundSolution = false;

            for (const squad of squads) {
                // 模擬升級後的屬性
                let bp = 0, bm = 0, bt = 0;
                const boostedSquad = squad.map(m => {
                    const newLvl = Math.min(60, m.lvl + levelBoost);
                    const newStats = getStats(m.cls, newLvl);
                    bp += newStats[0];
                    bm += newStats[1];
                    bt += newStats[2];
                    return { ...m, lvl: newLvl, stats: newStats, originalLvl: m.lvl };
                });

                // 測試是否可達標
                const solution = solveTraining(bp, bm, bt, currTrain, reqP, reqM, reqT);

                if (solution.success) {
                    suggestions.push({
                        squad: boostedSquad,
                        levelBoost,
                        steps: solution.path.length,
                        path: solution.path,
                        finalStats: solution.finalStats
                    });
                    foundSolution = true;
                    break; // 找到一個就跳出
                }
            }

            if (foundSolution && suggestions.length >= 3) {
                break; // 找到足夠的建議就停止
            }
        }

        // 顯示結果
        if (suggestions.length === 0) {
            resultContent.innerHTML = `
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
                    <h3 class="text-red-700 dark:text-red-400 font-bold mb-2">${t.msg_no_level_solution || '即使升至 60 級仍無法達成'}</h3>
                    <p class="text-red-600 dark:text-red-300">${t.msg_no_level_solution_desc || '建議：提升分隊等級 (Rank) 以增加訓練上限，或調整任務需求。'}</p>
                </div>
            `;
        } else {
            let html = `
                <div class="mb-4 text-center font-bold text-amber-600 dark:text-amber-400 text-lg">
                    ${(t.msg_level_suggestions || '💡 找到 {count} 個升級建議').replace('{count}', suggestions.length)}
                </div>
            `;

            suggestions.forEach((sug, idx) => {
                const levelInfo = sug.squad.map(m =>
                    m.originalLvl < m.lvl ? `<span class="text-amber-600 dark:text-amber-400">${(t.recruit_names && t.recruit_names[m.name]) || m.name}: Lv${m.originalLvl}→${m.lvl}</span>` : ''
                ).filter(x => x).join(', ');

                html += `
                    <div class="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-2 border-amber-300 dark:border-amber-600 mb-4 shadow-sm">
                        <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2 flex justify-between items-center flex-wrap">
                            <span>#${idx + 1} - ${(t.msg_level_boost || '升 {boost} 級後可達成').replace('{boost}', sug.levelBoost)}</span>
                            <span class="text-xs font-normal px-2 py-1 bg-amber-100 dark:bg-amber-800 rounded text-amber-700 dark:text-amber-300">
                                ${t.msg_success_found.replace('{steps}', sug.steps)}
                            </span>
                        </h3>
                        <div class="text-sm text-amber-800 dark:text-amber-200 mb-3">${levelInfo || '所有隊員已達 60 級'}</div>
                        <div class="flex justify-center gap-2 flex-wrap">
                            ${sug.squad.map(m => `
                                <div class="text-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-700 flex flex-col items-center w-20">
                                    <div class="w-16 h-20 bg-slate-200 dark:bg-slate-600 rounded-md mb-1 overflow-hidden flex justify-center items-center shadow-sm relative">
                                        ${m.img ? `<img src="${m.img}" class="w-full h-full object-cover">` : `<span class="font-bold text-slate-500">${m.name.substring(0, 2)}</span>`}
                                    </div>
                                    <div class="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate w-full">${(t.recruit_names && t.recruit_names[m.name]) || m.name}</div>
                                    <div class="text-[10px] ${m.originalLvl < m.lvl ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500'}">
                                        Lv${m.originalLvl}${m.originalLvl < m.lvl ? '→' + m.lvl : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });

            resultContent.innerHTML = html;
        }
    }, 100);
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

        const currentSum = current.p + current.m + current.t;

        // Try all 6 training ops
        for (let op of TRAINING_OPS) {
            let nextP, nextM, nextT;

            // 遊戲機制：素質未滿時只加不減，已滿時完整套用訓練效果
            if (currentSum < cap) {
                // 未滿：只加正數部分
                nextP = current.p + Math.max(0, op.cost[0]);
                nextM = current.m + Math.max(0, op.cost[1]);
                nextT = current.t + Math.max(0, op.cost[2]);
            } else {
                // 已滿：完整套用訓練效果
                nextP = current.p + op.cost[0];
                nextM = current.m + op.cost[1];
                nextT = current.t + op.cost[2];

                // 已滿時，若任一屬性會變成負數，該訓練不可執行
                if (nextP < 0 || nextM < 0 || nextT < 0) continue;
            }

            // 素質不可超過上限，總和也不可超過上限
            if (nextP > cap || nextM > cap || nextT > cap) continue;
            const nextSum = nextP + nextM + nextT;
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
    resultSection.style.display = 'block';
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
    for (let i = 0; i < 8; i++) {
        const isActive = document.getElementById(`active-${i}`).checked;
        if (!isActive) continue;

        const nameInput = document.getElementById(`name-${i}`);
        const name = nameInput.dataset.recruitId || nameInput.value;
        const cls = document.getElementById(`class-${i}`).value;
        const lvl = parseInt(document.getElementById(`lvl-${i}`).value);
        const rData = RECRUIT_DATA.find(r => r.name === name);
        members.push({
            id: i, name, cls, lvl, stats: getStats(cls, lvl),
            img: rData ? rData.img : null
        });
    }

    if (members.length < 4) {
        resultContent.innerHTML = `<h3 class="text-red-700 dark:text-red-400 font-bold mb-2">${t.msg_error_min_members}</h3><p>${t.msg_error_min_members_desc}</p>`;
        return;
    }

    const squads = getCombinations(members, 4);
    let solutions = [];

    squads.forEach(squad => {
        let bp = 0, bm = 0, bt = 0;
        squad.forEach(m => { bp += m.stats[0]; bm += m.stats[1]; bt += m.stats[2]; });

        const solution = solveTraining(bp, bm, bt, currTrain, reqP, reqM, reqT);

        if (solution.success) {
            solutions.push({
                squad: squad,
                steps: solution.path.length,
                path: solution.path,
                finalStats: solution.finalStats,
                isPartial: false
            });
        } else if (solution.partialSuccess) {
            solutions.push({
                squad: squad,
                steps: solution.path.length,
                path: solution.path,
                finalStats: solution.finalStats,
                isPartial: true,
                matchedStats: solution.matchedStats,
                missing: solution.missing
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
    } else if (partialSolutions.length > 0) {
        displaySolutions = partialSolutions;
        isShowingPartial = true;
    } else {
        // 完全無解 - 顯示簡易提示 + 進階模擬按鈕
        resultContent.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
                <h3 class="text-red-700 dark:text-red-400 font-bold mb-2 text-lg">${t.msg_impossible}</h3>
                <p class="text-red-600 dark:text-red-300 mb-4">${t.msg_impossible_desc}</p>
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-4">
                    <p class="text-amber-700 dark:text-amber-300 mb-3">
                        ${t.msg_level_hint || '💡 提升隊員等級可增加基礎屬性，可能達成任務需求。'}
                    </p>
                    <button onclick="simulateLevelUp()" 
                        class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow transition-colors">
                        ${t.btn_simulate_level || '🔍 模擬升級後的可行性'}
                    </button>
                </div>
            </div>
        `;
        window._lastCalcParams = { members, currTrain, reqP, reqM, reqT };
        return;
    }

    // Sort by steps (asc), partial results also by total missing
    displaySolutions.sort((a, b) => {
        if (a.steps !== b.steps) return a.steps - b.steps;
        if (a.isPartial && b.isPartial) {
            const aMissing = a.missing.missingP + a.missing.missingM + a.missing.missingT;
            const bMissing = b.missing.missingP + b.missing.missingM + b.missing.missingT;
            return aMissing - bMissing;
        }
        return 0;
    });

    // Take top 8
    const bestSolutions = displaySolutions.slice(0, 8);
    const rank = parseInt(document.getElementById('rank-selector').value);

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
        <div class="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 ${borderColor} mb-6 shadow-sm">
            <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2 flex justify-between items-center flex-wrap">
                <span>#${idx + 1} - ${t.msg_success_found.replace('{steps}', sol.steps)}${partialBadge}</span>
                <span class="text-xs font-normal text-slate-500">${t.msg_req.replace('{reqP}', reqP).replace('{reqM}', reqM).replace('{reqT}', reqT)}</span>
                ${missingHint}
            </h3>
            
            <div class="flex justify-center gap-2 mb-4 flex-wrap">
                ${sol.squad.map(m => `
                    <div class="text-center p-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex flex-col items-center w-24">
                        <div class="w-20 h-28 bg-slate-200 dark:bg-slate-600 rounded-md mb-1 overflow-hidden flex justify-center items-center shadow-sm border border-slate-300 dark:border-slate-500 relative">
                            ${m.img ? `<img src="${m.img}" class="w-full h-full object-cover">` : `<span class="font-bold text-slate-500">${m.name.substring(0, 2)}</span>`}
                            <img src="${CLASS_ICONS[m.cls]}" class="absolute bottom-1 right-1 w-6 h-6 drop-shadow-md z-10" title="${(t.class_names && t.class_names[m.cls]) || m.cls}">
                        </div>
                        <div class="font-bold text-xs text-slate-800 dark:text-slate-200 truncate w-full">${(t.recruit_names && t.recruit_names[m.name]) || m.name}</div>
                        <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">${(t.class_names && t.class_names[m.cls]) || m.cls} Lv${m.lvl}</div>
                    </div>
                `).join('')}
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-4 text-sm border-l-4 border-slate-300 dark:border-slate-600">
                <h4 class="font-bold mb-2 text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">${t.msg_analysis.replace('{rank}', rank)}</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                        <div class="text-slate-500 dark:text-slate-400 mb-1">${t.msg_base}</div>
                        <div class="font-mono font-bold text-slate-700 dark:text-slate-300">
                            <span class="stat-phy">P:${sol.squad.reduce((a, b) => a + b.stats[0], 0)}</span>
                            <span class="stat-men">M:${sol.squad.reduce((a, b) => a + b.stats[1], 0)}</span>
                            <span class="stat-tac">T:${sol.squad.reduce((a, b) => a + b.stats[2], 0)}</span>
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
                              <span class="stat-phy mr-2">P:${sol.finalStats.p + sol.squad.reduce((a, b) => a + b.stats[0], 0)}</span>
                              <span class="stat-men mr-2">M:${sol.finalStats.m + sol.squad.reduce((a, b) => a + b.stats[1], 0)}</span>
                              <span class="stat-tac">T:${sol.finalStats.t + sol.squad.reduce((a, b) => a + b.stats[2], 0)}</span>
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
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-4 text-center">
                <p class="text-amber-700 dark:text-amber-300 mb-3">
                    ${t.msg_level_hint || '💡 提升隊員等級可增加基礎屬性，可能達成任務需求。'}
                </p>
                <button onclick="simulateLevelUp()" 
                    class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow transition-colors">
                    ${t.btn_simulate_level || '🔍 模擬升級後的可行性'}
                </button>
            </div>
        `;
        // 儲存計算參數供模擬使用
        window._lastCalcParams = { members, currTrain, reqP, reqM, reqT };
    }

    resultContent.innerHTML = html;
    saveSquadronData();
}
