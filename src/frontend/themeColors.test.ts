import { describe, expect, it } from 'vitest';

import { getThemeProperties, isDarkColor } from './themeColors';

describe('isDarkColor', () => {
  it('tells dark backgrounds from light ones', () => {
    expect(isDarkColor('#16324f')).toBe(true);
    expect(isDarkColor('#000000')).toBe(true);
    expect(isDarkColor('#ffffff')).toBe(false);
    expect(isDarkColor('#f9f9fb')).toBe(false);
    expect(isDarkColor('#808080')).toBe(false);
    expect(isDarkColor('not a color')).toBe(false);
  });
});

describe('getThemeProperties', () => {
  it('takes the colors for the surface, in CSS form', () => {
    const colors = {
      popup: '#123456',
      popup_text: [255, 255, 255],
      popup_highlight: [10, 20, 30, 0.5],
      sidebar: 'rgb(1, 2, 3)',
    };
    expect(getThemeProperties(colors, 'popup')).toEqual({
      '--ctg-theme-background': '#123456',
      '--ctg-theme-text': 'rgb(255 255 255 / 1)',
      '--color-accent-primary': 'rgb(10 20 30 / 0.5)',
    });
    expect(getThemeProperties(colors, 'sidebar')).toEqual({
      '--ctg-theme-background': 'rgb(1, 2, 3)',
      '--ctg-theme-text': null,
      '--color-accent-primary': null,
    });
  });

  it('gives nothing for a theme without colors', () => {
    expect(Object.values(getThemeProperties(null, 'popup'))).toEqual([null, null, null]);
  });
});
