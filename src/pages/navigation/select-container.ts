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
import { ExtensionPageService } from '../../lib/ExtensionPageService';
import { TabGroupDirectorySnapshot } from '../../lib/tabGroups/TabGroupDirectorySnapshot';

import { ContainerEditorElement } from '../../components/container-editor';

import { settingsButton, containersElement } from './navigation-elements';
import { setUrl } from './navigation-i18n';
import { createCreateContainerButton, createTemporaryContainerButton, createPrivateBrowsingButton, renderContainer } from './navigation-renderer';

type EnvType = {
  url: string;
  tab: CompatTab;
  displayedContainers: DisplayedContainer[];
  tabGroupDirectorySnapshot: TabGroupDirectorySnapshot;
  privateBrowsingSupported: boolean;
};

const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const tabUrlService = TabUrlService.getInstance<TabUrlService>();
const extensionService = ExtensionService.getInstance();
const temporaryContainerService = TemporaryContainerService.getInstance();
const tabGroupDirectory = new TabGroupDirectory();
const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const displayedContainerService = DisplayedContainerService.getInstance();
const urlRegistrationService = UrlRegistrationService.getInstance();
const extensionPageService = ExtensionPageService.getInstance();

const blankScreen = () => {
  document.body.style.display = 'none';
};

const restoreScreen = () => {
  document.body.style.display = '';
};

blankScreen();

let errored = false;
const handleError = (e: unknown) => {
  errored = true;
  console.error(e);
  blankScreen();
};

document.onerror = (e) => {
  handleError(e);
};

const params = new URLSearchParams(location.search);

const urlId = params.get('urlId') || '';
const urlPromise = urlRegistrationService.getAndRevokeUrl(urlId);
const currentTabPromise = browser.tabs.getCurrent();

const envPromise: Promise<EnvType> = Promise.all([
  urlPromise,
  currentTabPromise,
  displayedContainerService.getDisplayedContainersByPrivateBrowsing(false),
  tabGroupDirectory.getSnapshot(),
  extensionService.isAllowedInPrivateBrowsing(),
]).then(([url, browserTab, displayedContainers, tabGroupDirectorySnapshot, privateBrowsingSupported]) => {
  if (null == url) {
    throw new Error('Invalid URL');
  }
  new URL(url); // throws if invalid
  if (!browserTab.id) {
    throw new Error('Current tab has no ID');
  }
  const tab = new CompatTab(browserTab);
  return { url, tab, displayedContainers, tabGroupDirectorySnapshot, privateBrowsingSupported };
});

settingsButton.addEventListener('click', () => {
  extensionPageService.openInBackground(ExtensionPageService.OPTIONS);
});

const _loadUrl = (env: EnvType) => {
  blankScreen();
  return tabUrlService.loadUrlInTab(env.tab.id, env.url);
};

const _reopenInContainer = (env: EnvType, cookieStoreId: string) => {
  if (env.tab.cookieStore.id == cookieStoreId) {
    _loadUrl(env);
    return;
  }
  blankScreen();
  containerTabOpenerService.reopenTabInContainer(env.tab.id, cookieStoreId, true, env.url);
};

const _createContainerElement = (env: EnvType, displayedContainer: DisplayedContainer) => {
  const reopenInContainer = _reopenInContainer.bind(null, env);
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

const createSpecialButtons = (env: EnvType, privateBrowsingSupported: boolean) => {
  const reopenInContainer = _reopenInContainer.bind(null, env);

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
};

const handleRedirect = (env: EnvType) => {
  const { tab } = env;
  const loadUrl = _loadUrl.bind(null, env);
  if (tab.isPrivate) {
    // no containers in private mode
    loadUrl();
  } else if (tab.cookieStore.userContextId != 0) {
    // already in a container
    loadUrl();
  } else if (tab.pinned) {
    // pinned tabs are not from outside Firefox
    loadUrl();
  }
};

envPromise.then(async (env) => {
  const createContainerElement = _createContainerElement.bind(null, env);

  const { url, displayedContainers, tabGroupDirectorySnapshot, privateBrowsingSupported } = env;
  setUrl(url);
  handleRedirect(env);
  createSpecialButtons(env, privateBrowsingSupported);

  [... displayedContainers].sort((a, b) => {
    return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStore.id, b.cookieStore.id);
  }).forEach(createContainerElement);

  contextualIdentityFactory.onCreated.addListener(createContainerElement);

  if (!errored) {
    restoreScreen();
  }
}).catch((e) => {
  handleError(e);
});
