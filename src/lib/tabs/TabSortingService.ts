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

import { diffArrays } from 'diff';
import browser from 'webextension-polyfill';
import { BackgroundService } from 'weeg-utils';
import { CompatTab } from 'weeg-tabs';

import { ServiceRegistry } from '../ServiceRegistry';
import { TabSortingProvider } from '../tabGroups/TabSortingProvider';
import { TagService } from '../tabGroups/TagService';
import { CompatConsole } from '../console/CompatConsole';
import { PerformanceHistoryService } from '../PerformanceHistoryService';
import { SpinnerService } from '../SpinnerService';

import { config } from '../../config/config';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const tabSortingProvider = new TabSortingProvider();
const tagService = TagService.getInstance();
const performanceHistoryService = PerformanceHistoryService.getInstance<PerformanceHistoryService>();
const spinnerService = SpinnerService.getInstance();

// the fact that this value is not preserved long-term in nonpersistent background page is not a problem.
let tabSorting = false;

// https://qiita.com/piroor/items/5e338ec2799dc1d75e6f
const sortTabsByWindow = async (windowId: number) => {
  try {
    const browserTabs = await browser.tabs.query({windowId: windowId});
    const tabs = browserTabs.map((tab) => new CompatTab(tab));
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    let sortedTabs = tabs.filter(tab => !tab.pinned);

    const origTabIdList = sortedTabs.map(tab => tab.id);
    sortedTabs = await tabSortingProvider.getTabSortingOrder(sortedTabs);
    const targetTabIdList = sortedTabs.map(tab => tab.id);

    const diffs = diffArrays(origTabIdList, targetTabIdList);
    let currentIds = [... origTabIdList];

    const promises: Promise<unknown>[] = [];
    const pinnedCount = pinnedTabs.length;
    for (const diff of diffs) {
      if (!diff.added) continue;

      const movingIds = diff.value;
      const lastMovingId = movingIds[movingIds.length - 1] as number;
      const nearestFollowingIndex = targetTabIdList.indexOf(lastMovingId) + 1;
      let newIndex = nearestFollowingIndex < targetTabIdList.length ? currentIds.indexOf(targetTabIdList[nearestFollowingIndex] as number) : -1;
      if (newIndex < 0) {
        newIndex = origTabIdList.length;
      }
      const oldIndex = currentIds.indexOf(movingIds[0] as number);
      if (oldIndex < newIndex) {
        newIndex--;
      }
      const targetIndex = pinnedCount + newIndex;

      promises.push(browser.tabs.move(movingIds, {index: targetIndex}));

      currentIds = currentIds.filter(id => !movingIds.includes(id));
      currentIds.splice(newIndex, 0, ...movingIds);
    }
    try {
      await Promise.all(promises);
    } catch (e) {
      console.error('Error moving tabs on window %d', windowId, e);
    }
  } catch (e) {
    console.error(e);
  }
};

export class TabSortingService extends BackgroundService<void, void> {
  public override getServiceName(): string {
    return 'TabSortingService';
  }

  protected override initializeBackground(): void {
    // only executed in background page.
    tabSortingProvider.onChanged.addListener(() => this.sortTabs());
    tagService.onChanged.addListener(() => this.sortTabs());
  }

  private async getWindowIds(): Promise<number[]> {
    const browserWindows = await browser.windows.getAll({windowTypes: ['normal']});
    return browserWindows.filter((browserWindow) => browserWindow.id != null).map((browserWindow) => browserWindow.id as number);
  }

  protected override async execute(): Promise<void> {
    const enabled = await config['tab.sorting.enabled'].getValue();
    if (!enabled) return;
    if (tabSorting) {
      console.debug('Tab sorting is already in progress.');
      return;
    }
    tabSorting = true;
    spinnerService.beginTransaction('tab-sorting');
    try {
      for (const windowId of await this.getWindowIds()) {
        const windowStartTime = Date.now();
        let windowSuccess = false;
        try {
          await sortTabsByWindow(windowId);
          windowSuccess = true;
        } catch (e) {
          console.error('Tab sorting error:', e);
        } finally {
          const windowEndTime = Date.now();
          const sortingDuration = windowEndTime - windowStartTime;
          performanceHistoryService.addEntry(`TabSortingService.execute.byWindow.${windowId}`, windowStartTime, sortingDuration);
          if (windowSuccess) {
            if (sortingDuration > 500) {
              console.info('Tab sorting for window %d took %d ms', windowId, sortingDuration);
            }
          } else {
            console.error('Tab sorting for window %d failed in %d ms', windowId, sortingDuration);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      spinnerService.endTransaction('tab-sorting');
      tabSorting = false;
    }
  }

  public async sortTabs() {
    await this.call();
  }
}

ServiceRegistry.getInstance().registerService('TabSortingService', TabSortingService.getInstance<TabSortingService>());
