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
import { CookieStore } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';

import { OpenTabsService } from '../lib/states/OpenTabsService';
import { ActiveContainerService } from '../lib/states/ActiveContainerService';
import { ElapsedTimeService } from '../lib/ElapsedTimeService';
import { CompatConsole } from '../lib/console/CompatConsole';

import { config } from '../config/config';

import { BeforeRequestHandler } from './includes/BeforeRequestHandler';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const openTabsService = OpenTabsService.getInstance();
const activeContainerService = ActiveContainerService.getInstance();
const elapsedTimeService = ElapsedTimeService.getInstance();

const beforeRequestHandler = new BeforeRequestHandler(async (details) => {
  // This is never called for private tabs.
  try {
    if (details.cookieStoreId == null || details.cookieStoreId != CookieStore.DEFAULT.id || details.tabId == -1 || details.frameId != 0 || details.originUrl || details.incognito) return false;
    const cookieStoreId = details.cookieStoreId;

    const [elapsedTime, externalTabContainerOption, tabIsPreviouslyOpen] = await Promise.all([
      elapsedTimeService.getElapsedTime(),
      config['tab.external.containerOption'].getValue(),
      openTabsService.hasTab(details.tabId),
    ]);

    // do not redirect if the tab is loaded when the browser is started
    if (elapsedTime < 2000) return false;

    if (externalTabContainerOption == 'disabled') {
      return false;
    }

    if (tabIsPreviouslyOpen) {
      // we have commented this out because it is IO intensive
      // console.info('Ignoring manually navigated tab: %d', details.tabId);
      return false;
    }

    const {tabId, url} = details;

    if ('sticky' == externalTabContainerOption) {
      const browserTab = await browser.tabs.get(tabId);
      const tab = new CompatTab(browserTab);
      const {windowId} = tab;

      const activeCookieStoreId = await activeContainerService.getActiveContainer(windowId);
      if (cookieStoreId == activeCookieStoreId || activeCookieStoreId == null) {
        console.log('Tab %d in active cookie store %s', tabId, cookieStoreId);
        return false;
      } else {
        browser.tabs.create({
          cookieStoreId: activeCookieStoreId,
          url,
          windowId,
        }).then(() => {
          console.log('Reopened %s in container id %s', url, activeCookieStoreId);
          return browser.tabs.remove(tabId);
        }).catch((e) => {
          console.error(e);
        });
      }
    }

    console.log('Capturing request for tab %d: %s', tabId, url);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
});
beforeRequestHandler.startListening();
