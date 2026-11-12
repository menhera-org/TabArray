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

/*
  Shows each container as a native tab group and keeps the two in sync (ROADMAP.md, phase 3).
*/

import browser from 'webextension-polyfill';
import { StorageItem } from 'weeg-storage';
import { CookieStore } from 'weeg-containers';

import { config } from '../config/config';
import { CompatConsole } from '../lib/console/CompatConsole';
import { IndexTab } from '../lib/tabs/IndexTab';
import { ContextualIdentityService } from '../lib/tabGroups/ContextualIdentityService';
import { NativeTabGroupService } from '../lib/tabGroups/NativeTabGroupService';
import {
  fromGroupColor,
  planWindow,
  PlannerContainer,
  TAB_GROUP_ID_NONE,
  toGroupColor,
} from '../lib/tabGroups/NativeTabGroupPlanner';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const nativeTabGroupService = NativeTabGroupService.getInstance();
const contextualIdentityFactory = ContextualIdentityService.getInstance().getFactory();

// Whether containers hidden before sync started have become collapsed groups.
const migrated = new StorageItem<boolean>('tab.groups.nativeSync.migrated', false, StorageItem.AREA_LOCAL);

// One task at a time, so a change made in the tab bar reaches the container before the next sync reads it.
let queue: Promise<void> = Promise.resolve();
const enqueue = (task: () => Promise<void>) => {
  queue = queue.then(task).catch((e) => {
    console.error(e);
  });
};

// Groups with a tab bar change still in the queue: sync must not overwrite their title or color first.
const pendingGroupChanges = new Map<number, number>();

const getContainers = async (): Promise<Map<string, PlannerContainer & { rawColor: string }>> => {
  const identities = await contextualIdentityFactory.getAll();
  return new Map(
    identities.map((identity) => [
      identity.cookieStore.id,
      { name: identity.name, color: toGroupColor(identity.color), rawColor: identity.color },
    ])
  );
};

const isSyncedWindow = async (windowId: number): Promise<boolean> => {
  try {
    const browserWindow = await browser.windows.get(windowId);
    return !browserWindow.incognito && browserWindow.type == 'normal';
  } catch {
    return false; // closed meanwhile
  }
};

const syncWindow = async (windowId: number) => {
  if (!(await nativeTabGroupService.isActive()) || !(await isSyncedWindow(windowId))) return;
  const [browserTabs, groups, containers] = await Promise.all([
    browser.tabs.query({ windowId }),
    browser.tabGroups.query({ windowId }),
    getContainers(),
  ]);
  const actions = planWindow(
    browserTabs
      .filter((browserTab) => browserTab.id != null)
      .map((browserTab) => ({
        id: browserTab.id as number,
        index: browserTab.index,
        pinned: browserTab.pinned,
        cookieStoreId: browserTab.cookieStoreId ?? CookieStore.DEFAULT.id,
        groupId: browserTab.groupId ?? TAB_GROUP_ID_NONE,
      })),
    groups.map((group) => ({ id: group.id, title: group.title ?? '', color: group.color })),
    containers
  );
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'ungroup': {
          await browser.tabs.ungroup(action.tabIds);
          break;
        }
        case 'group': {
          if (action.groupId !== undefined) {
            await browser.tabs.group({ tabIds: action.tabIds, groupId: action.groupId });
            break;
          }
          const groupId = await browser.tabs.group({ tabIds: action.tabIds, createProperties: { windowId } });
          const container = containers.get(action.cookieStoreId);
          if (container) {
            await browser.tabGroups.update(groupId, { title: container.name, color: container.color });
          }
          break;
        }
        case 'update': {
          if (pendingGroupChanges.has(action.groupId)) break;
          await browser.tabGroups.update(action.groupId, { title: action.title, color: action.color });
          break;
        }
      }
    } catch (e) {
      console.warn('Tab group sync failed on window %d: %s', windowId, JSON.stringify(action), e);
    }
  }
};

const pendingWindowIds = new Set<number>();
let syncTimer: ReturnType<typeof setTimeout> | undefined;
/** Debounced, so a burst of tab events (including our own moves and the sorter's) runs one sync per window. */
const scheduleWindow = (windowId: number | undefined) => {
  if (windowId == null || windowId == browser.windows.WINDOW_ID_NONE) return;
  pendingWindowIds.add(windowId);
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const windowIds = [...pendingWindowIds];
    pendingWindowIds.clear();
    for (const id of windowIds) enqueue(() => syncWindow(id));
  }, 200);
};

const scheduleAllWindows = async () => {
  for (const browserWindow of await browser.windows.getAll({ windowTypes: ['normal'] })) {
    scheduleWindow(browserWindow.id);
  }
};

/**
 * A title or color set in the tab bar goes to the container. Only a group holding all the container's
 * tabs in its window speaks for the container, not a group the user dragged one of its tabs into.
 */
const applyGroupChange = async (groupId: number) => {
  if (!(await nativeTabGroupService.isActive())) return;
  let group: browser.TabGroups.TabGroup;
  try {
    group = await browser.tabGroups.get(groupId); // the current state, not the event's copy
  } catch {
    return; // removed meanwhile
  }
  const browserTabs = await browser.tabs.query({ windowId: group.windowId });
  const cookieStoreIds = new Set(browserTabs.filter((tab) => tab.groupId == groupId).map((tab) => tab.cookieStoreId));
  if (cookieStoreIds.size != 1) return; // the next sync splits it
  const [cookieStoreId = ''] = cookieStoreIds as Set<string>;
  if (browserTabs.some((tab) => tab.cookieStoreId == cookieStoreId && !tab.pinned && tab.groupId != groupId)) return;
  const container = (await getContainers()).get(cookieStoreId);
  if (!container) return; // no container
  const params: { name?: string; color?: string } = {};
  const title = (group.title ?? '').trim();
  if ('' !== title && title != container.name) params.name = title;
  const color = fromGroupColor(group.color, container.rawColor);
  if (color !== undefined) params.color = ContextualIdentityService.toSupportedColor(color);
  if (params.name === undefined && params.color === undefined) return;
  console.info('Updating container %s from its tab group: %s', cookieStoreId, JSON.stringify(params));
  await browser.contextualIdentities.update(cookieStoreId, params);
};

/** Containers hidden with tabs.hide before sync started are shown and collapsed instead. */
const migrateHiddenContainers = async () => {
  const containers = await getContainers();
  for (const browserWindow of await browser.windows.getAll({ populate: true, windowTypes: ['normal'] })) {
    if (browserWindow.incognito || browserWindow.id == null || !browserWindow.tabs) continue;
    const hiddenTabs = browserWindow.tabs.filter(
      (tab) =>
        tab.hidden && !tab.pinned && containers.has(tab.cookieStoreId ?? '') && !IndexTab.isIndexTabUrl(tab.url ?? '')
    );
    if (hiddenTabs.length > 0) {
      await browser.tabs.show(hiddenTabs.map((tab) => tab.id as number));
    }
    await syncWindow(browserWindow.id);
    for (const cookieStoreId of new Set(hiddenTabs.map((tab) => tab.cookieStoreId as string))) {
      await nativeTabGroupService.setContainerCollapsed(browserWindow.id, cookieStoreId, true);
    }
  }
};

/** Turning sync off ungroups container tabs. Tabs of collapsed groups are hidden, so they stay out of sight. */
const ungroupContainers = async () => {
  const containers = await getContainers();
  for (const browserWindow of await browser.windows.getAll({ populate: true, windowTypes: ['normal'] })) {
    if (browserWindow.incognito || browserWindow.id == null || !browserWindow.tabs) continue;
    for (const group of await browser.tabGroups.query({ windowId: browserWindow.id })) {
      const groupTabs = browserWindow.tabs.filter((tab) => tab.groupId == group.id && tab.id != null);
      // Groups of tabs with no container are the user's own.
      if (!groupTabs.some((tab) => containers.has(tab.cookieStoreId ?? ''))) continue;
      if (group.collapsed) {
        const tabIdsToHide = groupTabs.filter((tab) => !tab.active).map((tab) => tab.id as number);
        if (tabIdsToHide.length > 0) await browser.tabs.hide(tabIdsToHide);
      }
      await browser.tabs.ungroup(groupTabs.map((tab) => tab.id as number));
    }
  }
};

const start = async () => {
  if (!(await nativeTabGroupService.isActive())) return;
  if (!(await migrated.getValue())) {
    await migrateHiddenContainers();
    await migrated.setValue(true);
  }
  await scheduleAllWindows();
};

if (nativeTabGroupService.isSupported()) {
  enqueue(start);

  config['tab.groups.nativeSync'].onChanged.addListener((enabled) => {
    enqueue(async () => {
      if (enabled) {
        await start();
      } else {
        await ungroupContainers();
        await migrated.setValue(false);
      }
    });
  });

  browser.tabs.onCreated.addListener((tab) => scheduleWindow(tab.windowId));
  browser.tabs.onAttached.addListener((_tabId, attachInfo) => scheduleWindow(attachInfo.newWindowId));
  browser.tabs.onMoved.addListener((_tabId, moveInfo) => scheduleWindow(moveInfo.windowId));
  browser.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => scheduleWindow(tab.windowId), {
    properties: ['pinned', 'groupId'],
  });

  browser.tabGroups.onCreated.addListener((group) => scheduleWindow(group.windowId));
  browser.tabGroups.onMoved.addListener((group) => scheduleWindow(group.windowId));
  browser.tabGroups.onRemoved.addListener((group, removeInfo) => {
    if (!removeInfo.isWindowClosing) scheduleWindow(group.windowId);
  });
  browser.tabGroups.onUpdated.addListener((group) => {
    pendingGroupChanges.set(group.id, (pendingGroupChanges.get(group.id) ?? 0) + 1);
    enqueue(async () => {
      try {
        await applyGroupChange(group.id);
      } finally {
        const count = (pendingGroupChanges.get(group.id) ?? 1) - 1;
        if (count > 0) pendingGroupChanges.set(group.id, count);
        else pendingGroupChanges.delete(group.id);
      }
    });
    scheduleWindow(group.windowId);
  });

  // A renamed or recolored container retitles its groups.
  contextualIdentityFactory.onUpdated.addListener(() => {
    scheduleAllWindows().catch((e) => {
      console.error(e);
    });
  });
}
