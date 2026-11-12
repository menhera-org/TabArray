/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
  @license
**/

import browser from 'webextension-polyfill';

import { CompatConsole } from '../lib/console/CompatConsole';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

/** Where the page shows: Firefox's own panels and sidebar take different theme colors. */
export type ThemeSurface = 'popup' | 'sidebar';

type ThemeColor = string | number[] | null | undefined;

const toCss = (color: ThemeColor): string | null => {
  if (typeof color == 'string') return color || null;
  if (Array.isArray(color) && color.length >= 3) {
    const [r, g, b, a = 1] = color;
    return `rgb(${r} ${g} ${b} / ${a})`;
  }
  return null;
};

/**
 * The CSS custom properties for a theme's colors on a surface, as Firefox's own popups and sidebar use
 * them (#33). A theme that sets none of them, such as the default one, gives none, and the pages keep
 * Firefox's design tokens.
 */
export const getThemeProperties = (
  colors: Record<string, ThemeColor> | null | undefined,
  surface: ThemeSurface
): Record<string, string | null> => ({
  '--ctg-theme-background': toCss(colors?.[surface]),
  '--ctg-theme-text': toCss(colors?.[`${surface}_text`]),
  '--color-accent-primary': toCss(colors?.[`${surface}_highlight`]),
});

/** Whether text on this color should be light: its relative luminance is low. "#rrggbb" only. */
export const isDarkColor = (hex: string): boolean => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!match) return false;
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255) as [number, number, number];
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b) < 0.18;
};

/** Any CSS color as "#rrggbb", which a canvas gives back for opaque colors. */
const toHex = (color: string): string => {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return '';
  context.fillStyle = color;
  return String(context.fillStyle);
};

/** Follows the current theme's colors on this page, also when the theme changes. */
export const followThemeColors = (surface: ThemeSurface) => {
  const style = document.documentElement.style;
  const apply = async () => {
    const { id: windowId } = await browser.windows.getCurrent();
    const theme = await browser.theme.getCurrent(windowId);
    const properties = getThemeProperties(theme.colors as Record<string, ThemeColor> | undefined, surface);
    for (const [name, value] of Object.entries(properties)) {
      if (value) style.setProperty(name, value);
      else style.removeProperty(name);
    }
    // Firefox's tokens pick their light or dark values by the color scheme, so it follows the background.
    // Stylesheets read data-color-scheme for what light-dark() cannot do, such as images.
    const background = properties['--ctg-theme-background'];
    const root = document.documentElement;
    if (background) {
      const scheme = isDarkColor(toHex(background)) ? 'dark' : 'light';
      style.setProperty('color-scheme', scheme);
      root.dataset.colorScheme = scheme;
    } else {
      style.removeProperty('color-scheme');
      delete root.dataset.colorScheme;
    }
  };
  const update = () => {
    apply().catch((e) => console.error(e));
  };
  update();
  browser.theme.onUpdated.addListener(update);
};
