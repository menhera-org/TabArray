// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
*/

import browser from 'webextension-polyfill';
import { Tab } from './Tab';

// private
type TabValue = {
  url: string;
  previewUrl: string;
};

export class TabPreviewService {
  // static definitions.
  private static readonly TAB_VALUE_KEY = 'weeg.tabPreview';

  // This must be at the end of static definitions.
  private static readonly INSTANCE = new TabPreviewService();

  public static getInstance(): TabPreviewService {
    return TabPreviewService.INSTANCE;
  }

  private constructor() {
    // Do nothing.
  }

  private async _getTabPreview(tabId: number): Promise<string> {
    return await browser.tabs.captureTab(tabId, {
      format: 'jpeg',
      quality: 50,
      scale: .25,
    });
  }

  private async _getTabValue(tabId: number): Promise<TabValue | undefined> {
    const tabValue = await browser.sessions.getTabValue(tabId, TabPreviewService.TAB_VALUE_KEY);
    return tabValue as TabValue | undefined;
  }

  private async _setTabValue(tabId: number, tabValue: TabValue): Promise<void> {
    await browser.sessions.setTabValue(tabId, TabPreviewService.TAB_VALUE_KEY, tabValue);
  }

  /**
   * Returns the tab preview image.
   * @param tabId the id of the tab to screenshot.
   * @returns data: url of the screenshot.
   */
  public async getTabPreview(tabId: number): Promise<string> {
    if (browser.sessions) {
      // Sessions API is available.
      const tab = await Tab.get(tabId);
      let tabValue = await this._getTabValue(tabId);
      if (tabValue && tabValue.url === tab.url) {
        // Tab preview is cached.
        return tabValue.previewUrl;
      }
      const previewUrl = await this._getTabPreview(tabId);
      tabValue = {
        url: tab.url,
        previewUrl,
      };
      await this._setTabValue(tabId, tabValue);
      return previewUrl;
    }
    return await this._getTabPreview(tabId);
  }
}
