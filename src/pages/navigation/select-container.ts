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
import { ExtensionService } from 'weeg-utils';
import { CompatTab } from 'weeg-tabs';
import { CookieStore, DisplayedContainer } from 'weeg-containers';

import { TemporaryContainerService } from '../../lib/tabGroups/TemporaryContainerService';
import { TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';
import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';
import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';

import * as i18n from '../../legacy-lib/modules/i18n';

import { ContainerEditorElement } from '../../components/container-editor';

const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const extensionService = ExtensionService.getInstance();
const temporaryContainerService = TemporaryContainerService.getInstance();
const tabGroupDirectory = new TabGroupDirectory();
const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const displayedContainerService = DisplayedContainerService.getInstance();

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
  browser.tabs.getCurrent().then((currentBrowserTab) => {
    if (null == currentBrowserTab.id) {
      throw new Error('Current tab has no ID');
    }
    return containerTabOpenerService.reopenTabInContainer(currentBrowserTab.id, cookieStoreId, true);
  }).catch((e) => {
    console.error(e);
  });
};

const renderButton = (tooltipText: string, name: string, iconUrl: string, useIconMask: boolean, maskColor = '#000000', aUserContextElement: HTMLButtonElement | null = null) => {
  const userContextElement = aUserContextElement ?? document.createElement('button');
  userContextElement.classList.add('container-button');
  userContextElement.textContent = '';
  userContextElement.title = tooltipText;

  const userContextIconElement = document.createElement('span');
  userContextIconElement.classList.add('container-button-icon');
  const userContextLabelElement = document.createElement('span');
  userContextLabelElement.classList.add('container-button-label');
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

const renderContainer = (displayedContainer: DisplayedContainer, aContainerElement: HTMLButtonElement | null = null) => {
  const tooltipText = i18n.getMessage('defaultContainerName', String(displayedContainer.cookieStore.userContextId));
  const iconUrl = displayedContainer.iconUrl || '/img/material-icons/category.svg';
  const containerElement = renderButton(tooltipText, displayedContainer.name, iconUrl, true, displayedContainer.colorCode || '#000', aContainerElement);
  return containerElement;
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

const createContainerElement = (displayedContainer: DisplayedContainer) => {
  const containerElement = renderContainer(displayedContainer);
  const cookieStoreId = displayedContainer.cookieStore.id;
  containersElement.append(containerElement);
  containerElement.addEventListener('click', () => {
    reopenInContainer(cookieStoreId);
  });
  contextualIdentityFactory.onRemoved.addListener((removedContextualIdentity) => {
    if (removedContextualIdentity.cookieStore.id == displayedContainer.cookieStore.id) {
      containerElement.remove();
    }
  });
  contextualIdentityFactory.onUpdated.addListener((updatedContextualIdentity) => {
    if (updatedContextualIdentity.cookieStore.id == displayedContainer.cookieStore.id) {
      renderContainer(updatedContextualIdentity, containerElement);
    }
  });
};

displayedContainerService.getDisplayedContainersByPrivateBrowsing(false).then(async (displayedContainers) => {
  const tabGroupDirectorySnapshot = await tabGroupDirectory.getSnapshot();
  const privateBrowsingSupported = await extensionService.isAllowedInPrivateBrowsing();
  if (privateBrowsingSupported) {
    const privateBrowsingButton = createPrivateBrowsingButton();
    containersElement.append(privateBrowsingButton);
    privateBrowsingButton.addEventListener('click', () => {
      reopenInContainer(CookieStore.PRIVATE.id);
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
    reopenInContainer(identity.cookieStore.id);
  });
  [... displayedContainers].sort((a, b) => {
    return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStore.id, b.cookieStore.id);
  }).forEach(createContainerElement);
});

contextualIdentityFactory.onCreated.addListener(createContainerElement);

browser.tabs.getCurrent().then((browserTab) => {
  const tab = new CompatTab(browserTab);
  if (tab.isPrivate) {
    // no containers in private mode
    location.href = url;
    return;
  }
  if (tab.cookieStore.userContextId != 0) {
    // already in a container
    location.href = url;
    return;
  }
  if (tab.pinned) {
    // pinned tabs are not from outside Firefox
    location.href = url;
    return;
  }
});
