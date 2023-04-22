/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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

import { Theme } from './Theme';
import { DarkThemeMonitor } from './DarkThemeMonitor';
import { CssColor } from '../colors/CssColor';
import { Srgb } from '../colors/Srgb';
import { EventSink } from "weeg-events";

export class ThemeService {
  private static readonly INSTANCE = new ThemeService();

  public static getInstance(): ThemeService {
    return ThemeService.INSTANCE;
  }

  public readonly onThemeChanged = new EventSink<Theme>();

  private constructor() {
    browser.theme.onUpdated.addListener(async () => {
      const theme = await this.getTheme();
      this.onThemeChanged.dispatch(theme);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getBrowserTheme(): Promise<any> {
    return browser.theme.getCurrent(browser.windows.WINDOW_ID_CURRENT);
  }

  private parseThemeColor(color: unknown): string {
    if (Array.isArray(color)) {
      return `rgb(${color.join(',')})`;
    } else if (typeof color === 'string') {
      return color;
    }
    return '';
  }

  public async getTheme(): Promise<Theme> {
    const darkThemeMonitor = new DarkThemeMonitor();
    const browserTheme = await this.getBrowserTheme();
    const isDarkTheme = darkThemeMonitor.isDarkTheme;

    const backgroundColor = this.parseThemeColor(browserTheme.colors?.frame || browserTheme.colors?.accentcolor);
    const textColor = this.parseThemeColor(browserTheme.colors?.tab_text || browserTheme.colors?.bookmark_text || browserTheme.colors?.toolbar_text || browserTheme.colors?.tab_background_text
      || (isDarkTheme ? '#ffffff' : '#222222'));
    const secondaryTextColor = this.parseThemeColor(browserTheme.colors?.tab_background_text || browserTheme.colors?.textcolor
      || (isDarkTheme ? '#999999' : '#888888'));

    const secondaryMixedColor = CssColor.fromString('#888888').srgb;
    const backgroundMixedColor = CssColor.fromString(backgroundColor).srgb;

    const secondaryBackgroundColor = new CssColor(Srgb.fromXyz(backgroundMixedColor.toXyz().mix(secondaryMixedColor.toXyz(), .5)), 1).toString();

    return {
      backgroundColor,
      textColor,
      borderColor: secondaryTextColor,
      hoverColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      secondaryBackgroundColor,
    };
  }
}
