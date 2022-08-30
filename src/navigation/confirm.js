/* vim: set ts=2 sw=2 et ai : */
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

import { getStateManager } from '../modules/global-state.js';
import { BrowserTab } from '../state-manager/lib/BrowserTab.js';
import * as i18n from '../modules/i18n.js';
import { config } from '../modules/config.js';

const params = new URLSearchParams(location.search);

// empty values are turned into null
const url = params.get('url') || null;

const containersElement = document.querySelector('#containers');
const headingElement = document.querySelector('#heading');
const descriptionElement = document.querySelector('#description');
const promptElement = document.querySelector('#prompt');
const settingsButton = document.querySelector('#button-settings');

document.title = i18n.getMessage('titleSelectContainer');
headingElement.textContent = i18n.getMessage('titleSelectContainer');
descriptionElement.textContent = i18n.getMessage('descriptionSelectContainer', url || 'about:blank');
promptElement.textContent = i18n.getMessage('promptSelectContainer');
settingsButton.textContent = i18n.getMessage('buttonSettings');

settingsButton.addEventListener('click', (ev) => {
  browser.runtime.openOptionsPage().then(() => {
    console.log('Opened options page');
  }).catch((e) => {
    console.error(e);
  });
});

const renderUserContext = (userContext, aUserContextElement) => {
  const userContextElement = aUserContextElement || document.createElement('button');
  userContextElement.classList.add('userContext-button');
  userContextElement.textContent = '';
  userContextElement.title = i18n.getMessage('defaultContainerName', userContext.id);

  const userContextIconElement = document.createElement('span');
  userContextIconElement.classList.add('userContext-button-icon');
  const userContextLabelElement = document.createElement('span');
  userContextLabelElement.classList.add('userContext-button-label');
  userContextElement.append(userContextIconElement, userContextLabelElement);

  const iconUrl = userContext.iconUrl || '/img/category_black_24dp.svg';
  userContextIconElement.style.mask = `url(${iconUrl}) center center/75% no-repeat`;
  userContextIconElement.style.backgroundColor = userContext.colorCode || '#000';
  userContextLabelElement.textContent = userContext.name;
  return userContextElement;
};

const createUserContextElement = (userContext) => {
  const userContextElement = renderUserContext(userContext);
  const cookieStoreId = userContext.cookieStoreId;
  containersElement.append(userContextElement);
  userContextElement.addEventListener('click', (ev) => {
    Promise.all([
      browser.tabs.getCurrent(),
      browser.tabs.create({
        active: true,
        windowId: browser.windows.WINDOW_ID_CURRENT,
        cookieStoreId,
        url,
      }),
    ]).then(([currentTabObj, _createdTabObj]) => {
      return browser.tabs.remove(currentTabObj.id);
    }).catch((e) => {
      console.error(e);
    });
  });
  userContext.addEventListenerWindow(window, 'remove', (ev) => {
    userContextElement.remove();
  });
  userContext.addEventListenerWindow(window, 'change', (ev) => {
    renderUserContext(userContext, userContextElement);
  });
};

try {
  new URL(url);
  getStateManager().then((aStateManager) => {
    globalThis.StateManager = aStateManager;
    const userContexts = StateManager.getUserContexts();
    containersElement.textContent = '';
    for (const userContext of userContexts) {
      createUserContextElement(userContext);
    }
    StateManager.addEventListenerWindow(window, 'userContextCreate', (ev) => {
      const {userContextId} = ev.detail;
      const userContext = StateManager.getUserContext(userContextId);
      createUserContextElement(userContext);
    });
  });

  // If pinned, continue to load the url
  browser.tabs.getCurrent().then((tabObj) => {
    if (tabObj.pinned) {
      location.href = url;
    }
    config.get('tab.external.containerOption').then(async (optionValue) => {
      if ('sticky' == optionValue) {
        const activeTabs = await browser.tabs.query({
          windowId: tabObj.windowId,
          active: true,
        })
      }
    });
  });
} catch (e) {
  console.warn('Invalid URL: %s', url);
  // invalid URL state
}
