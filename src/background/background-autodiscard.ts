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
import { Alarm } from 'weeg-utils';

import { CompatConsole } from '../lib/console/CompatConsole';
import { MenuItem } from '../lib/menus/MenuItem';
import { StartupService } from '../lib/StartupService';
import { selectTabsToDiscard } from '../lib/tabs/selectTabsToDiscard';

import { config } from '../config/config';

const AUTODISCARD_INTERVAL_IN_MINUTES = 5; // 5 minutes

// Session value marking a tab to stay loaded (#282). Session values survive restarts.
const KEEP_LOADED = 'keepLoaded';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

const isKeptLoaded = async (tabId: number): Promise<boolean> =>
  (await browser.sessions.getTabValue(tabId, KEEP_LOADED)) === true;

/** Also tells Firefox not to free the tab when memory is low. */
const setKeptLoaded = async (tabId: number, keep: boolean) => {
  if (keep) {
    await browser.sessions.setTabValue(tabId, KEEP_LOADED, true);
  } else {
    await browser.sessions.removeTabValue(tabId, KEEP_LOADED);
  }
  await browser.tabs.update(tabId, { autoDiscardable: !keep });
};

const keepLoadedMenu = new MenuItem({
  id: 'tab-keep-loaded',
  type: 'checkbox',
  title: browser.i18n.getMessage('contextMenuKeepTabLoaded'),
  contexts: ['tab'],
});

keepLoadedMenu.onShown.addListener(({ tab }) => {
  if (!tab) return;
  isKeptLoaded(tab.id)
    .then((checked) => {
      browser.menus.update(keepLoadedMenu.id, { checked });
      browser.menus.refresh();
    })
    .catch((e) => {
      console.error(e);
    });
});

keepLoadedMenu.onClicked.addListener(({ tab, checked }) => {
  if (!tab) return;
  setKeptLoaded(tab.id, !!checked).catch((e) => {
    console.error(e);
  });
});

// Firefox does not keep autoDiscardable across restarts, so apply it again from the session values.
StartupService.getInstance().onStartup.addListener(() => {
  browser.tabs
    .query({})
    .then(async (browserTabs) => {
      for (const browserTab of browserTabs) {
        if (browserTab.id != null && (await isKeptLoaded(browserTab.id))) {
          await browser.tabs.update(browserTab.id, { autoDiscardable: false });
        }
      }
    })
    .catch((e) => {
      console.error(e);
    });
});

const alarm = new Alarm('tab.autoDiscard', {
  periodInMinutes: AUTODISCARD_INTERVAL_IN_MINUTES,
});

alarm.onAlarm.addListener(async () => {
  const minAge = await config['tab.autoDiscard.minAge'].getValue();
  if (minAge < 0) {
    return;
  }

  const browserTabs = await browser.tabs.query({});
  const keptTabIds = new Set<number>();
  for (const browserTab of browserTabs) {
    if (browserTab.id != null && (await isKeptLoaded(browserTab.id))) keptTabIds.add(browserTab.id);
  }
  const tabIdsToDiscard = selectTabsToDiscard(browserTabs, minAge, Date.now(), keptTabIds);
  if (tabIdsToDiscard.length == 0) {
    return;
  }
  try {
    await browser.tabs.discard(tabIdsToDiscard);
    console.debug(`Discarded ${tabIdsToDiscard.length} tab(s)`);
  } catch (e) {
    console.error(e);
  }
});
