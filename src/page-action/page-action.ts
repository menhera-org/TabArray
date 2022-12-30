// vim: ts=2 sw=2 et ai
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
import { ContainerAttributes, ContextualIdentity, CookieStore } from '../frameworks/tabAttributes';
import { UserContext } from '../frameworks/tabGroups';
import { Uint32 } from '../frameworks/types';
import { UserContextService } from '../userContexts/UserContextService';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';

type ContainerInfo = {
  cookieStoreId: string;
  name: string;
  iconUrl: string;
};

const userContextService = UserContextService.getInstance();
const userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();

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
  const userContexts = await UserContext.getAll();
  const filledUserContexts = userContexts.map((userContext) => userContextService.fillDefaultValues(userContext));
  await userContextSortingOrderStore.initialized;
  const sortedUserContext = userContextSortingOrderStore.sort(filledUserContexts).filter((userContext) => userContext.id !== UserContext.ID_DEFAULT);
  const defaultContainer = CookieStore.DEFAULT;
  const privateBrowsingContainer = CookieStore.PRIVATE;
  const containerInfos: ContainerInfo[] = [
    {
      cookieStoreId: defaultContainer.id,
      name: browser.i18n.getMessage('noContainer'),
      iconUrl: '',
    },
    ... sortedUserContext.map((userContext) => {
      const contextualIdentity = new ContextualIdentity({
        userContextId: userContext.id,
        privateBrowsingId: 0 as Uint32.Uint32,
        name: userContext.name,
        icon: userContext.icon,
        color: userContext.color,
      });
      const containerAttributes = new ContainerAttributes(contextualIdentity, contextualIdentity.name, contextualIdentity.color, contextualIdentity.icon);
      return {
        cookieStoreId: containerAttributes.id,
        name: containerAttributes.name,
        iconUrl: containerAttributes.iconUrl,
      };
    }),
    {
      cookieStoreId: privateBrowsingContainer.id,
      name: browser.i18n.getMessage('privateBrowsing'),
      iconUrl: '/img/firefox-icons/private-browsing-icon.svg',
    },
  ];
  return containerInfos.filter((containerInfo) => containerInfo.cookieStoreId !== currentCookieStoreId);
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
      const url = browserTab.url;
      const newBrowserTab = await browser.tabs.create({
        url,
        cookieStoreId: containerInfo.cookieStoreId,
        windowId: browserTab.windowId,
        active: false,
      });

      await Promise.all([
        browser.tabs.remove(browserTab.id),
        browser.tabs.update(newBrowserTab.id, {active: true}),
      ]);
    });
    mainElement?.appendChild(containerButton);
  }
})().catch((e) => {
  console.error(e);
});
