import { LocalizedText } from './types';

export function getLocalizedText(textObj: LocalizedText | undefined, lang: string): string {
  if (!textObj) return 'Unknown';
  const key = lang as keyof LocalizedText;
  return textObj[key] || textObj.en || 'Unknown';
}

// 使用 Region ID (大區域) 判定版本更為準確且完整
export const EXPANSION_MAP: Record<number, string> = {
  // 2.0 ARR (La Noscea, Shroud, Thanalan, Mor Dhona)
  22: 'exp_2', 23: 'exp_2', 24: 'exp_2', 26: 'exp_2',

  // 3.0 HW (Coerthas, Dravania, Abalathia)
  25: 'exp_3', 497: 'exp_3', 498: 'exp_3',

  // 4.0 SB (Gyr Abania, Othard)
  2400: 'exp_4', 2401: 'exp_4', 2402: 'exp_4',

  // 5.0 ShB (Norvrandt)
  2950: 'exp_5',

  // 6.0 EW (Ilsabard, Northern Empty, Sea of Stars)
  3700: 'exp_6', 3701: 'exp_6', 3702: 'exp_6', 3703: 'exp_6', 3704: 'exp_6', 3705: 'exp_6',

  // 7.0 DT (Tural)
  4500: 'exp_7', 4501: 'exp_7', 4502: 'exp_7'
};

export const EXPANSION_NAMES: Record<string, string> = {
  'exp_2': 'A Realm Reborn',
  'exp_3': 'Heavensward',
  'exp_4': 'Stormblood',
  'exp_5': 'Shadowbringers',
  'exp_6': 'Endwalker',
  'exp_7': 'Dawntrail',
};

export const GATHERING_ICONS = {
  folklore: 'https://xivapi.com/i/026000/026168_hr1.png',
  mining: 'https://xivapi.com/i/062000/062201_hr1.png',
  quarrying: 'https://xivapi.com/i/062000/062202_hr1.png',
  logging: 'https://xivapi.com/i/062000/062203_hr1.png',
  harvesting: 'https://xivapi.com/i/062000/062204_hr1.png'
};

export function getEorzeaTime(): string {
  const EORZEA_RATIO = 1440 / 70;
  const now = new Date();
  const eorzeaDate = new Date(now.getTime() * EORZEA_RATIO);
  const hh = eorzeaDate.getUTCHours().toString().padStart(2, '0');
  const mm = eorzeaDate.getUTCMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getEorzeaMinutes(): number {
  const EORZEA_RATIO = 1440 / 70;
  const now = new Date();
  const eorzeaDate = new Date(now.getTime() * EORZEA_RATIO);
  return eorzeaDate.getUTCHours() * 60 + eorzeaDate.getUTCMinutes();
}

export interface NodeStatus {
  status: 'active' | 'soon' | 'later';
  secondsUntil: number; // Real seconds
  secondsRemaining: number; // Real seconds
  progressPercent: number;
  spawnTime: string; // HH:00 format
  endRealTimestamp: number; // Real ms timestamp when window ends (for anchored countdown)
  startRealTimestamp: number; // Real ms timestamp when window started (for progress bar)
  durationRealMs: number; // Total real duration in ms
}

export function calculateNodeStatus(spawns: number[], durationMin: number = 60, _unusedCurrentEt?: number): NodeStatus {
  const EORZEA_RATIO = 1440 / 70; // 20.571428...
  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms
  
  const nowMs = Date.now();
  const etMs = nowMs * EORZEA_RATIO;
  const currentEtOfDay = etMs % ONE_DAY_MS;

  // Check Actives
  for (const spawnHour of spawns) {
    const spawnStartMs = spawnHour * 60 * 60 * 1000;
    const durationMs = durationMin * 60 * 1000;
    let spawnEndMs = spawnStartMs + durationMs;

    // Handle Active Windows (Check yesterday, today, tomorrow to handle wrapping)
    const windows = [
      { start: spawnStartMs - ONE_DAY_MS, end: spawnEndMs - ONE_DAY_MS },
      { start: spawnStartMs, end: spawnEndMs },
      { start: spawnStartMs + ONE_DAY_MS, end: spawnEndMs + ONE_DAY_MS }
    ];

    for (const win of windows) {
      if (currentEtOfDay >= win.start && currentEtOfDay < win.end) {
        const remainingEtMs = win.end - currentEtOfDay;
        const elapsedEtMs = currentEtOfDay - win.start;
        const remainingRealMs = remainingEtMs / EORZEA_RATIO;
        const elapsedRealMs = elapsedEtMs / EORZEA_RATIO;
        const totalRealMs = durationMs / EORZEA_RATIO;

        return {
          status: 'active',
          secondsUntil: 0,
          secondsRemaining: Math.ceil(remainingRealMs / 1000),
          progressPercent: Math.min(100, (elapsedEtMs / durationMs) * 100),
          spawnTime: `${spawnHour.toString().padStart(2, '0')}:00`,
          endRealTimestamp: nowMs + remainingRealMs,
          startRealTimestamp: nowMs - elapsedRealMs,
          durationRealMs: totalRealMs,
        };
      }
    }
  }

  // Find Next Spawn
  let minDiffMs = Infinity;
  let nextSpawnHour = spawns[0];

  for (const spawnHour of spawns) {
    const spawnStartMs = spawnHour * 60 * 60 * 1000;
    let diffMs = spawnStartMs - currentEtOfDay;
    if (diffMs < 0) diffMs += ONE_DAY_MS; // Next day
    
    if (diffMs < minDiffMs) {
      minDiffMs = diffMs;
      nextSpawnHour = spawnHour;
    }
  }

  const waitRealMs = minDiffMs / EORZEA_RATIO;
  const secondsUntil = Math.ceil(waitRealMs / 1000);
  
  // "Soon" if < 5 real minutes (300s)
  const status = secondsUntil <= 300 ? 'soon' : 'later';

  return {
    status,
    secondsUntil,
    secondsRemaining: 0,
    progressPercent: 0,
    spawnTime: `${nextSpawnHour.toString().padStart(2, '0')}:00`,
    endRealTimestamp: nowMs + waitRealMs,
    startRealTimestamp: 0,
    durationRealMs: 0,
  };
}

export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 0) return "00:00";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}