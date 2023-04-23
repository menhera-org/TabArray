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
import { TabUrlService } from '../../lib/tabs/TabUrlService';
import { UrlRegistrationService } from '../../lib/UrlRegistrationService';

import * as i18n from '../../legacy-lib/modules/i18n';

import { ContainerEditorElement } from '../../components/container-editor';

const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const tabUrlService = TabUrlService.getInstance<TabUrlService>();
const extensionService = ExtensionService.getInstance();
const temporaryContainerService = TemporaryContainerService.getInstance();
const tabGroupDirectory = new TabGroupDirectory();
const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const displayedContainerService = DisplayedContainerService.getInstance();
const urlRegistrationService = UrlRegistrationService.getInstance();

const blackScreenOnError = (e: unknown) => {
  console.error(e);
  document.body.style.display = 'none';
};

document.onerror = (e) => {
  blackScreenOnError(e);
};

const params = new URLSearchParams(location.search);

const urlId = parseInt(params.get('urlId') || '0', 10);

if (isNaN(urlId)) {
  throw new Error('Invalid URL ID');
}

const urlPromise = urlRegistrationService.getAndRevokeUrl(urlId).then((url) => {
  if (!url) {
    throw new Error('Invalid URL');
  }
  return url;
});

urlPromise.catch((e) => {
  blackScreenOnError(e);
});

const containersElement = document.querySelector('#containers');
const headingElement = document.querySelector('#heading');
const descriptionElement = document.querySelector('#description');
const promptElement = document.querySelector('#prompt');
const settingsButton = document.querySelector('#button-settings');

if (!containersElement || !headingElement || !descriptionElement || !promptElement || !settingsButton) {
  throw new Error('Missing elements');
}

document.documentElement.lang = i18n.getEffectiveLocale();
document.title = i18n.getMessage('titleSelectContainer');
headingElement.textContent = i18n.getMessage('titleSelectContainer');
promptElement.textContent = i18n.getMessage('promptSelectContainer');
settingsButton.textContent = i18n.getMessage('buttonSettings');

urlPromise.then((url) => {
  descriptionElement.textContent = i18n.getMessage('descriptionSelectContainer', url || 'about:blank');
});

const currentTabPromise = browser.tabs.getCurrent();

settingsButton.addEventListener('click', () => {
  browser.runtime.openOptionsPage().then(() => {
    console.log('Opened options page');
  }).catch((e) => {
    console.error(e);
  });
});

const reopenInContainer = (cookieStoreId: string) => {
  Promise.all([currentTabPromise, urlPromise]).then(([currentBrowserTab, url]) => {
    if (null == currentBrowserTab.id) {
      throw new Error('Current tab has no ID');
    }
    return containerTabOpenerService.reopenTabInContainer(currentBrowserTab.id, cookieStoreId, true, url);
  }).catch((e) => {
    console.error(e);
  });
};

const loadUrl = (url: string) => {
  document.body.style.display = 'none';
  currentTabPromise.then((currentBrowserTab) => {
    if (currentBrowserTab.id == null) throw new Error('Current tab has no ID');
    return tabUrlService.loadUrlInTab(currentBrowserTab.id, url);
  }).catch((e) => {
    console.error(e);
  });
};

const renderButton = (tooltipText: string, name: string, iconUrl: string, useIconMask: boolean, maskColor = '#000000', aContainerElement: HTMLButtonElement | null = null) => {
  const containerElement = aContainerElement ?? document.createElement('button');
  containerElement.classList.add('container-button');
  containerElement.textContent = '';
  containerElement.title = tooltipText;

  const containerIconElement = document.createElement('span');
  containerIconElement.classList.add('container-button-icon');
  const containerLabelElement = document.createElement('span');
  containerLabelElement.classList.add('container-button-label');
  containerElement.append(containerIconElement, containerLabelElement);

  if (useIconMask) {
    containerIconElement.style.mask = `url(${iconUrl}) center center/75% no-repeat`;
    containerIconElement.style.backgroundColor = maskColor;
  } else {
    containerIconElement.style.background = `no-repeat center/75% url(${iconUrl})`;
  }

  containerLabelElement.textContent = name;
  return containerElement;
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

Promise.all([currentTabPromise, urlPromise]).then(([browserTab, url]) => {
  const tab = new CompatTab(browserTab);
  if (tab.isPrivate) {
    // no containers in private mode
    loadUrl(url);
    return;
  }
  if (tab.cookieStore.userContextId != 0) {
    // already in a container
    loadUrl(url);
    return;
  }
  if (tab.pinned) {
    // pinned tabs are not from outside Firefox
    loadUrl(url);
    return;
  }
}).catch((e) => {
  blackScreenOnError(e);
});
