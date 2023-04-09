// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

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

import * as i18n from '../modules/i18n';
import { Tab } from '../frameworks/tabs';
import { config } from '../config/config';
import { UserContext } from '../frameworks/tabGroups';
import * as containers from '../modules/containers';
import { UserContextService } from '../userContexts/UserContextService';
import { PrivateBrowsingService } from '../frameworks/tabs';
import { ContainerEditorElement } from '../components/container-editor';
import { TemporaryContainerService } from '../containers/TemporaryContainerService';
import { TabGroupDirectory } from '../lib/tabGroups/TabGroupDirectory';

const extensionService = ExtensionService.getInstance();
const privateBrowsingService = PrivateBrowsingService.getInstance();
const temporaryContainerService = TemporaryContainerService.getInstance();
const tabGroupDirectory = new TabGroupDirectory();

const params = new URLSearchParams(location.search);

// empty values are turned into null
const url = params.get('url') || null;

const containersElement = document.querySelector('#containers');
const headingElement = document.querySelector('#heading');
const descriptionElement = document.querySelector('#description');
const promptElement = document.querySelector('#prompt');
const settingsButton = document.querySelector('#button-settings');

if (!url) {
  throw new Error('No URL provided');
}

new URL(url); // throws for invalid urls

if (!containersElement || !headingElement || !descriptionElement || !promptElement || !settingsButton) {
  throw new Error('Missing elements');
}

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');
document.title = i18n.getMessage('titleSelectContainer');
headingElement.textContent = i18n.getMessage('titleSelectContainer');
descriptionElement.textContent = i18n.getMessage('descriptionSelectContainer', url || 'about:blank');
promptElement.textContent = i18n.getMessage('promptSelectContainer');
settingsButton.textContent = i18n.getMessage('buttonSettings');

settingsButton.addEventListener('click', () => {
  browser.runtime.openOptionsPage().then(() => {
    console.log('Opened options page');
  }).catch((e) => {
    console.error(e);
  });
});

const reopenInContainer = (cookieStoreId: string) => {
  Promise.all([
    browser.tabs.getCurrent(),
    browser.tabs.create({
      active: true,
      windowId: browser.windows.WINDOW_ID_CURRENT,
      cookieStoreId,
      url,
    }),
  ]).then(([currentTabObj, createdTabObj]) => {
    console.debug('Created tab', createdTabObj);
    if (undefined == currentTabObj.id) {
      throw new Error('Current tab has no ID');
    }
    return browser.tabs.remove(currentTabObj.id);
  }).catch((e) => {
    console.error(e);
  });
};

const renderButton = (tooltipText: string, name: string, iconUrl: string, useIconMask: boolean, maskColor = '#000000', aUserContextElement: HTMLButtonElement | null = null) => {
  const userContextElement = aUserContextElement ?? document.createElement('button');
  userContextElement.classList.add('userContext-button');
  userContextElement.textContent = '';
  userContextElement.title = tooltipText;

  const userContextIconElement = document.createElement('span');
  userContextIconElement.classList.add('userContext-button-icon');
  const userContextLabelElement = document.createElement('span');
  userContextLabelElement.classList.add('userContext-button-label');
  userContextElement.append(userContextIconElement, userContextLabelElement);

  if (useIconMask) {
    userContextIconElement.style.mask = `url(${iconUrl}) center center/75% no-repeat`;
    userContextIconElement.style.backgroundColor = maskColor;
  } else {
    userContextIconElement.style.background = `no-repeat center/75% url(${iconUrl})`;
  }

  userContextLabelElement.textContent = name;
  return userContextElement;
};

const renderUserContext = (origUserContext: UserContext, aUserContextElement: HTMLButtonElement | null = null) => {
  const userContext = UserContextService.getInstance().fillDefaultValues(origUserContext);
  const tooltipText = i18n.getMessage('defaultContainerName', String(userContext.id));
  const iconUrl = userContext.iconUrl || '/img/material-icons/category.svg';
  const userContextElement = renderButton(tooltipText, userContext.name, iconUrl, true, userContext.colorCode || '#000', aUserContextElement);
  return userContextElement;
};

const createPrivateBrowsingButton = () => {
  const tooltipText = i18n.getMessage('privateBrowsing');
  const name = tooltipText;
  const iconUrl = '/img/firefox-icons/private-browsing-icon.svg';
  const button = renderButton(tooltipText, name, iconUrl, false);
  return button;
};

const createCreateContainerButton = () => {
  const tooltipText = i18n.getMessage('buttonNewContainer');
  const name = tooltipText;
  const iconUrl = '/img/firefox-icons/add.svg';
  const button = renderButton(tooltipText, name, iconUrl, false);
  return button;
};

const createTemporaryContainerButton = () => {
  const tooltipText = i18n.getMessage('buttonNewTemporaryContainer');
  const name = tooltipText;
  const iconUrl = '/img/material-icons/timelapse.svg';
  const button = renderButton(tooltipText, name, iconUrl, false);
  return button;
};

const createUserContextElement = (userContext: UserContext) => {
  const userContextElement = renderUserContext(userContext);
  const cookieStoreId = userContext.cookieStoreId;
  containersElement.append(userContextElement);
  userContextElement.addEventListener('click', () => {
    reopenInContainer(cookieStoreId);
  });
  UserContext.onRemoved.addListener((removedUserContext) => {
    if (removedUserContext == userContext.id) {
      userContextElement.remove();
    }
  });
  UserContext.onUpdated.addListener((updatedUserContext) => {
    if (updatedUserContext.id == userContext.id) {
      renderUserContext(updatedUserContext, userContextElement);
    }
  });
};

UserContext.getAll().then(async (userContexts) => {
  const tabGroupDirectorySnapshot = await tabGroupDirectory.getSnapshot();
  const privateBrowsingSupported = await extensionService.isAllowedInPrivateBrowsing();
  if (privateBrowsingSupported) {
    const privateBrowsingButton = createPrivateBrowsingButton();
    containersElement.append(privateBrowsingButton);
    privateBrowsingButton.addEventListener('click', () => {
      privateBrowsingService.openTabInPrivateBrowsing(url).then(async () => {
        const currentTab = await browser.tabs.getCurrent();
        if (undefined == currentTab.id) {
          throw new Error('Current tab has no ID');
        }
        await browser.tabs.remove(currentTab.id);
      }).catch((e) => {
        console.error(e);
      });
    });
  }

  const createContainerButton = createCreateContainerButton();
  containersElement.append(createContainerButton);
  createContainerButton.addEventListener('click', () => {
    const containerEditorElement = new ContainerEditorElement();
    document.body.append(containerEditorElement);
  });

  const temporaryContainerButton = createTemporaryContainerButton();
  containersElement.append(temporaryContainerButton);
  temporaryContainerButton.addEventListener('click', async () => {
    const identity = await temporaryContainerService.createTemporaryContainer();
    reopenInContainer(identity.id);
  });
  [... userContexts].sort((a, b) => {
    return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStoreId, b.cookieStoreId);
  }).forEach(createUserContextElement);
});

UserContext.onCreated.addListener(createUserContextElement);

browser.tabs.getCurrent().then((browserTab) => {
  const tab = new Tab(browserTab);
  if (tab.isPrivate()) {
    // no containers in private mode
    location.href = url;
    return;
  }
  if (tab.isContainer()) {
    // already in a container
    location.href = url;
    return;
  }
  if (tab.pinned) {
    // pinned tabs are not from outside Firefox
    location.href = url;
    return;
  }

  config['tab.external.containerOption'].getValue().then(async (optionValue) => {
    if ('sticky' == optionValue) {
      const activeTabs = await browser.tabs.query({
        windowId: browserTab.windowId,
        active: true,
      });
      for (const activeTab of activeTabs) {
        if (!activeTab.cookieStoreId) continue;
        const {cookieStoreId} = activeTab;
        const userContextId = UserContext.fromCookieStoreId(cookieStoreId);
        containers.reopenInContainer(userContextId, tab.id, tab.isPrivate()).catch((e) => {
          console.error(e);
        });
        break;
      }
    }
  });
});
