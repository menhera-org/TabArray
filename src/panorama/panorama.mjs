// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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


import '../components/panorama-tab.mjs';
import '../modules/background-console.mjs';
import * as containers from '../modules/containers.mjs';
import {WebExtensionsBroadcastChannel} from '../modules/broadcasting.mjs';
import { getStateManager } from '../modules/global-state.mjs';
import * as i18n from '../modules/i18n.mjs';

document.title = i18n.getMessage('panoramaGrid');
document.documentElement.lang = i18n.getEffectiveLocale();

const renderTab = (tab) => {
  const tabElement = document.createElement('panorama-tab');
  if (tab.url) {
    tabElement.title = tab.url;
  }
  if (tab.title) {
    tabElement.tabTitle = tab.title;
  } else if (tab.url) {
    tabElement.tabTitle = tab.url;
  }
  if (tab.favIconUrl) {
    tabElement.iconUrl = tab.favIconUrl;
  }
  if (tab.previewUrl) {
    tabElement.previewUrl = tab.previewUrl;
  }
  return tabElement;
};

const renderContainer = (userContextId, containerElement) => {
	const cookieStoreId = containers.toCookieStoreId(userContextId);
  const userContext = StateManager.getUserContext(userContextId);
  const container = userContext;
  const tabs = userContext.getBrowserTabs();
  if (!containerElement) {
    containerElement = document.createElement('div');
    containerElement.classList.add('panorama-container');
    containerElement.id = 'container-' + userContextId;
  }
  containerElement.dataset.userContextId = userContextId;

  let containerHeading = containerElement.querySelector('.container-heading');
  if (!containerHeading) {
    containerHeading = document.createElement('div');
    containerHeading.classList.add('container-heading');
    containerElement.append(containerHeading);
  }

  const containerIcon = document.createElement('div');
	const iconUrl = container.iconUrl || '/img/category_black_24dp.svg';
	containerIcon.style.mask = `url(${iconUrl}) center center/75% no-repeat`;
	containerIcon.style.backgroundColor = container.colorCode || '#000';
	containerIcon.classList.add('container-icon');
	containerHeading.append(containerIcon);
  
  const containerLabel = document.createElement('div');
  containerLabel.classList.add('container-label');
  containerLabel.textContent = container.name;
  containerHeading.append(containerLabel);

  containerHeading.dataset.tabCount = tabs.length;

  const containerTabsElement = document.createElement('div');
  containerTabsElement.classList.add('container-tabs');
  containerElement.append(containerTabsElement);

  const newTabElement = document.createElement('button');
  newTabElement.classList.add('container-new-tab');
  newTabElement.textContent = browser.i18n.getMessage('buttonOpenTabInContainer');
  containerTabsElement.append(newTabElement);
  newTabElement.addEventListener('click', (ev) => {
    containers.openNewTabInContainer(userContextId, browser.windows.WINDOW_ID_CURRENT).then(() => {
      window.close();
    });
  });

  for (const browserTab of tabs) {
    const tabElement = renderTab(browserTab);
    containerTabsElement.append(tabElement);
    tabElement.addEventListener('button-tab-click', async (ev) => {
      await browser.tabs.update(browserTab.id, {
        active: true,
      });
      await browser.windows.update(browserTab.windowId, {
        focused: true,
      });
      window.close();
    });
    tabElement.addEventListener('button-tab-close', async (ev) => {
      await browser.tabs.remove(browserTab.id);
		  await render();
    });
  }

  return containerElement;
};

const render = () => {
  const userContexts = StateManager.getUserContexts();
  const containersElement = document.querySelector('#containers');
  containersElement.textContent = '';
  for (const userContext of userContexts) {
    if (!userContext.tabIds.size) continue;
    const containerElement = renderContainer(userContext.id);
    containersElement.append(containerElement);
  }
  for (const userContext of userContexts) {
    if (userContext.tabIds.size) continue;
    const containerElement = renderContainer(userContext.id);
    containersElement.append(containerElement);
  }
};

getStateManager().then((StateManager) => {
  globalThis.StateManager = StateManager;
  render();
});

const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');
tabChangeChannel.addEventListener('message', ev => {
	render();
});
