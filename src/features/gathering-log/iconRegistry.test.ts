import { describe, expect, it } from 'vitest';
import { getItemIconUrl, UI_ICON_URLS } from './iconRegistry';

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
