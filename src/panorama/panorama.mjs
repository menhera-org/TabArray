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

document.title = browser.i18n.getMessage('panoramaGrid');

const renderTab = async (tab) => {
  //
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
  if (tab.discarded) {
    //
  } else {
    browser.tabs.captureTab(tab.id, {scale: .25}).then((url) => {
      tabElement.previewUrl = url;
    });
  }
  return tabElement;
};

const renderContainer = async (userContextId, containerElement) => {
  //
  const windowId = (await browser.windows.getCurrent()).id;
	const cookieStoreId = containers.toCookieStoreId(userContextId);
	const container = await containers.get(userContextId);
	const tabs = await browser.tabs.query({cookieStoreId});
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

  await Promise.all(tabs.map((tab) => renderTab(tab).then((tabElement) => {
    containerTabsElement.append(tabElement);
    tabElement.addEventListener('button-tab-click', async (ev) => {
      await browser.tabs.update(tab.id, {
        active: true,
      });
      if (windowId != tab.windowId) {
        await browser.windows.update(tab.windowId, {
          focused: true,
        });
      }
      window.close();
    });
    tabElement.addEventListener('button-tab-close', async (ev) => {
      await browser.tabs.remove(tab.id);
		  await render();
    });
    return tabElement;
  })));

  return containerElement;
};

const render = async () => {
  //
  const userContextIds = [0, ... await containers.getIds()];
  const containersElement = document.querySelector('#containers');
  containersElement.textContent = '';
  const activeUserContextIds = await containers.getActiveIds();
  for (const userContextId of userContextIds) {
    if (!activeUserContextIds.includes(userContextId)) continue;
    const containerElement = await renderContainer(userContextId);
    containersElement.append(containerElement);
  }
  for (const userContextId of userContextIds) {
    if (activeUserContextIds.includes(userContextId)) continue;
    const containerElement = await renderContainer(userContextId);
    containersElement.append(containerElement);
  }
};

render().catch(e => console.error(e));

const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');
tabChangeChannel.addEventListener('message', ev => {
	render().catch(e => console.error(e));
});
