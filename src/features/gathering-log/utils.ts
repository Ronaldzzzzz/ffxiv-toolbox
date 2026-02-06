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