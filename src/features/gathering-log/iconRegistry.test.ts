import { describe, expect, it } from 'vitest';
import { getItemIconUrl, getMapImageUrl, UI_ICON_URLS } from './iconRegistry';

describe('getItemIconUrl', () => {
  it('rebuilds the v2 asset URL from a bare icon number (optimized data)', () => {
    expect(getItemIconUrl(1675, { 1675: 21209 })).toBe(
      'https://v2.xivapi.com/api/asset?path=ui/icon/021000/021209_hr1.tex&format=png'
    );
    // folder boundary: 20999 -> 020000, 21000 -> 021000
    expect(getItemIconUrl(1, { 1: 20999 })).toContain('ui/icon/020000/020999_hr1.tex');
    expect(getItemIconUrl(1, { 1: 21000 })).toContain('ui/icon/021000/021000_hr1.tex');
  });

  it('keeps handling legacy v2 path strings', () => {
    expect(getItemIconUrl(1675, { 1675: '/api/asset?path=ui/icon/021000/021209_hr1.tex&format=png' })).toBe(
      'https://v2.xivapi.com/api/asset?path=ui/icon/021000/021209_hr1.tex&format=png'
    );
  });

  it('keeps handling legacy v1 path strings', () => {
    expect(getItemIconUrl(5, { 5: '/i/021000/021209.png' })).toBe(
      'https://xivapi.com/i/021000/021209.png'
    );
  });

  it('falls back to the default icon for missing or empty entries', () => {
    expect(getItemIconUrl(42, {})).toBe(UI_ICON_URLS.defaultItem);
    expect(getItemIconUrl(42, { 42: '' })).toBe(UI_ICON_URLS.defaultItem);
  });
});

describe('UI_ICON_URLS', () => {
  it('resolves static icons through the v2 asset endpoint', () => {
    expect(UI_ICON_URLS.defaultItem).toBe(
      'https://v2.xivapi.com/api/asset?path=ui/icon/066000/066313_hr1.tex&format=png'
    );
  });

  it('keeps job companion portraits on v1 (no v2 equivalent)', () => {
    expect(UI_ICON_URLS.jobMiner).toBe('https://xivapi.com/cj/companion/miner.png');
  });
});

describe('getMapImageUrl', () => {
  it('rewrites the legacy v1 map path shape to the v2 asset endpoint', () => {
    expect(getMapImageUrl(2, 'https://xivapi.com/m/f1t1/f1t1.00.jpg')).toBe(
      'https://v2.xivapi.com/api/asset/map/f1t1/00'
    );
  });

  it('rewrites the legacy shape even when Teamcraft prefixes it with the v2 host', () => {
    expect(getMapImageUrl(2, 'https://v2.xivapi.com/m/f1t1/f1t1.00.jpg')).toBe(
      'https://v2.xivapi.com/api/asset/map/f1t1/00'
    );
  });

  it('passes through an already-correct v2 asset URL unchanged', () => {
    expect(getMapImageUrl(2, 'https://v2.xivapi.com/api/asset/map/f1t1/00')).toBe(
      'https://v2.xivapi.com/api/asset/map/f1t1/00'
    );
  });
});
