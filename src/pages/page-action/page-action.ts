// vim: ts=2 sw=2 et ai
/*
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
*/

import browser from 'webextension-polyfill';
import { ExtensionService } from 'weeg-utils';
import { CookieStore } from 'weeg-containers';

import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';
import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';

type ContainerInfo = {
  cookieStoreId: string;
  name: string;
  iconUrl: string;
};

const extensionService = ExtensionService.getInstance();
const tabGroupDirectory = new TabGroupDirectory();
const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();

const mainElement = document.querySelector('#main');

const setTextContent = (query: string, message: string) => {
  const element = document.querySelector(query);
  if (!element) {
    throw new Error(`Missing element: ${query}`);
  }
  element.textContent = browser.i18n.getMessage(message);
};

setTextContent('#headingReopen', 'headingReopen');

const currentBrowserTabPromise = browser.tabs.query({active: true, currentWindow: true}).then((browserTabs) => browserTabs[0]);

const getContainerInfos = async (): Promise<ContainerInfo[]> => {
  const currentBrowserTab = await currentBrowserTabPromise;
  const currentCookieStoreId = currentBrowserTab?.cookieStoreId;
  const contextualIdentities = await contextualIdentityFactory.getAll();
  const tabGroupDirectorySnapshot = await tabGroupDirectory.getSnapshot();
  contextualIdentities.sort((a, b) => {
    return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStore.id, b.cookieStore.id);
  });
  const defaultContainer = CookieStore.DEFAULT;
  const privateBrowsingContainer = CookieStore.PRIVATE;
  const privateBrowsingContainerInfos = await extensionService.isAllowedInPrivateBrowsing() ? [
    {
      cookieStoreId: privateBrowsingContainer.id,
      name: browser.i18n.getMessage('privateBrowsing'),
      iconUrl: '/img/firefox-icons/private-browsing-icon.svg',
    },
  ] : [];
  const containerInfos: ContainerInfo[] = [
    {
      cookieStoreId: defaultContainer.id,
      name: browser.i18n.getMessage('noContainer'),
      iconUrl: '',
    },
    ... contextualIdentities.map((contextualIdentity) => {
      return {
        cookieStoreId: contextualIdentity.cookieStore.id,
        name: contextualIdentity.name,
        iconUrl: contextualIdentity.iconUrl,
      };
    }),
    ... privateBrowsingContainerInfos,
  ];
  return containerInfos.filter((containerInfo) => containerInfo.cookieStoreId !== currentCookieStoreId);
};

const reopenTab = async (targetCookieStoreId: string, currentBrowserTab: browser.Tabs.Tab) => {
  if (currentBrowserTab.id == null) {
    throw new Error('currentBrowserTab.id is null');
  }
  await containerTabOpenerService.reopenTabInContainer(currentBrowserTab.id, targetCookieStoreId, true);
};

(async () => {
  const containerInfos = await getContainerInfos();
  for (const containerInfo of containerInfos) {
    const containerButton = document.createElement('button');
    const containerIcon = document.createElement('img');
    containerIcon.classList.add('container-icon');
    if (containerInfo.iconUrl) containerIcon.src = containerInfo.iconUrl;
    containerButton.appendChild(containerIcon);
    const containerLabel = document.createElement('span');
    containerLabel.textContent = containerInfo.name;
    containerLabel.classList.add('container-label');
    containerButton.appendChild(containerLabel);
    containerButton.classList.add('container-button');
    containerButton.addEventListener('click', async () => {
      const browserTab = await currentBrowserTabPromise;
      if (!browserTab || null == browserTab.id || null == browserTab.windowId || null == browserTab.url) {
        console.warn('invalid browser tab', browserTab);
        return;
      }

      // this menu is never shown on non-HTTP tabs
      await reopenTab(containerInfo.cookieStoreId, browserTab);
    });
    mainElement?.appendChild(containerButton);
  }
})().catch((e) => {
  console.error(e);
});
