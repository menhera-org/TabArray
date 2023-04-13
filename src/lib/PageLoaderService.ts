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

import browser from "webextension-polyfill";
import { BackgroundService } from "weeg-utils";

import { ServiceRegistry } from "./ServiceRegistry";

/**
 * This class loads a page if not already open.
 * @todo Open page in the currently active container.
 */
export class PageLoaderService extends BackgroundService<string, void> {
  public override getServiceName(): string {
    return 'PageLoaderService';
  }

  protected override initializeBackground(): void {
    // nothing.
  }

  protected override async execute(url: string): Promise<void> {
    const browserTabs = await browser.tabs.query({ url });
    if (browserTabs.length === 0) {
      await browser.tabs.create({ url });
    } else {
      for (const browserTab of browserTabs) {
        if (browserTab.windowId == null || browserTab.id == null) continue;
        await browser.windows.update(browserTab.windowId, { focused: true });
        await browser.tabs.update(browserTab.id, { active: true });
        break;
      }
    }
  }

  public async loadPage(url: string): Promise<void> {
    await this.call(url);
  }
}

ServiceRegistry.getInstance().registerService('PageLoaderService', PageLoaderService.getInstance<PageLoaderService>());
