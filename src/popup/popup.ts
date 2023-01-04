// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

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
import { PopupRenderer } from "./PopupRenderer";
import { config, privacyConfig } from '../config/config';
import { ConfigurationOption } from '../frameworks/config';
import { MenulistContainerElement } from '../components/menulist-container';
import { PopupUtils } from './PopupUtils';
import '../components/usercontext-colorpicker';
import '../components/usercontext-iconpicker';
import './PopupLocalizations';
// import './PopupThemes';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';
import { ExtensionService } from '../frameworks/extension';
import { cancelHandler, okHandler, keyHandler } from './PopupKeyHandlers';
import { TemporaryContainerService } from '../containers/TemporaryContainerService';
import { StorageArea } from '../frameworks/storage';

const utils = new PopupUtils();
const userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();
const extensionService = ExtensionService.getInstance();
const temporaryContainerService = TemporaryContainerService.getInstance();

const renderer = new PopupRenderer();

renderer.firstRenderingDone.then(() => {
  document.body.classList.remove('transparent');
});

const renderInBackground = () => {
  renderer.render().catch((e) => {
    console.error(e);
  });
};

const sitesElement = utils.queryElementNonNull<HTMLElement>('#sites');

const searchBox = utils.queryElementNonNull<HTMLInputElement>('#search');
const menuListElement = utils.queryElementNonNull<HTMLElement>('#menuList');

location.hash = '#main';
document.body.dataset.activeContent = 'main';
window.addEventListener('hashchange', () => {
  const activeContent = location.hash.slice(1);
  document.body.dataset.activeContent = activeContent;
  if ('main' == activeContent) {
    setTimeout(() => searchBox.focus());
  } else if ('' == activeContent) {
    location.hash = '#main';
  }
});

let configPopupSize;
config['appearance.popupSize'].observe((value) => {
  configPopupSize = value;
  if (configPopupSize == 'large') {
    document.body.classList.add('large');
  }
});

let firstRun = false;
config['help.shownOnce'].getValue().then((shownOnce) => {
  if (!shownOnce) {
    location.hash = '#help';
    config['help.shownOnce'].setValue(true, StorageArea.LOCAL);
    firstRun = true;
    initializeHelp();
  }
});

const setConfigValue = <T,>(option: ConfigurationOption<T>, value: T) => {
  option.setValue(value).catch((e) => {
    console.error(e);
  });
};

const setInputChecked = (inputElement: HTMLInputElement | null | undefined, value: boolean) => {
  if (!inputElement) {
    throw new Error('Missing input element');
  }
  inputElement.checked = value;
};

const inputFirstPartyIsolate = utils.queryElementNonNull<HTMLInputElement>('#input-firstPartyIsolate');

const initializeHelp = () => {
  setInputChecked(inputFirstPartyIsolate, true);
};

const setFirstPartyIsolate = (value: boolean) => {
  (async () => {
    if (value) {
      const cookieBehavior = await privacyConfig.cookieConfigBehavior.getValue();
      if (cookieBehavior == 'reject_trackers_and_partition_foreign') {
        await privacyConfig.cookieConfigBehavior.setValue('reject_trackers');
      }
    }
    setConfigValue(privacyConfig.firstPartyIsolate, value);
  })().catch((e) => {
    console.error(e);
  });
};

privacyConfig.firstPartyIsolate.observe((value) => {
  if (firstRun) {
    initializeHelp();
    return;
  }
  setInputChecked(inputFirstPartyIsolate, value);
});

inputFirstPartyIsolate.addEventListener('change', () => {
  setFirstPartyIsolate(inputFirstPartyIsolate.checked);
});

const inputFeatureLanguageOverrides = utils.queryElementNonNull<HTMLInputElement>('#input-featureLanguageOverrides');
const inputFeatureUaOverrides = utils.queryElementNonNull<HTMLInputElement>('#input-featureUaOverrides');

// feature.languageOverrides setting
config['feature.languageOverrides'].observe((value) => {
  setInputChecked(inputFeatureLanguageOverrides, value);
});

inputFeatureLanguageOverrides?.addEventListener('change', () => {
  setConfigValue(config['feature.languageOverrides'], inputFeatureLanguageOverrides.checked);
});

// feature.uaOverrides setting
config['feature.uaOverrides'].observe((value) => {
  setInputChecked(inputFeatureUaOverrides, value);
});

inputFeatureUaOverrides?.addEventListener('change', () => {
  setConfigValue(config['feature.uaOverrides'], inputFeatureUaOverrides.checked);
});

// Open a new window
const buttonNewWindow = utils.queryElementNonNull<HTMLButtonElement>('#button-new-window');
buttonNewWindow.addEventListener('click', () => {
  utils.openNewWindow(false);
});

// Open a new private window
const buttonNewPrivateWindow = utils.queryElementNonNull<HTMLButtonElement>('#button-new-private-window');
extensionService.isAllowedInPrivateBrowsing().then((allowed) => {
  if (!allowed) {
    buttonNewPrivateWindow.disabled = true;
  }
});

const buttonMenu = utils.queryElementNonNull<HTMLButtonElement>('#button-menu');
const topMenu = utils.queryElementNonNull<HTMLElement>('#top-menu');
buttonMenu.addEventListener('click', () => {
  topMenu.hidden = !topMenu.hidden;
});

const buttonAboutAddon = utils.queryElementNonNull<HTMLButtonElement>('#button-about-addon');
buttonAboutAddon.addEventListener('click', () => {
  utils.openAddonPage();
});

const amoLink = utils.queryElementNonNull<HTMLElement>('#help-banner-amo-link');
amoLink.addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.openAddonPage();
});

const privacyPolicyLink = utils.queryElementNonNull<HTMLElement>('#help-banner-privacy-policy');
privacyPolicyLink.addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.openPrivacyPolicyPage();
});

buttonNewPrivateWindow.addEventListener('click', () => {
  utils.openNewWindow(true);
});

utils.queryElementNonNull<HTMLButtonElement>('#button-settings').addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.openOptionsPage();
});

utils.queryElementNonNull<HTMLButtonElement>('#button-panorama').addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.openPanoramaPage();
});

utils.queryElementNonNull<HTMLButtonElement>('#button-cookies').addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.openCookiesPage();
});

utils.queryElementNonNull<HTMLButtonElement>('#button-sidebar').addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.toggleSidebar();
});

utils.queryElementNonNull<HTMLButtonElement>('#button-new-container').addEventListener('click', () => {
  renderer.modalRenderer.showNewContainerPanelAsync().then((result) => {
    if (!result) return;
    console.log('Created new container', result);
  });
});

utils.queryElementNonNull<HTMLButtonElement>('#button-new-temporary-container').addEventListener('click', () => {
  temporaryContainerService.createTemporaryContainer().then((identity) => {
    console.debug('Created temporary container', identity);
  }).catch((e) => {
    console.error(e);
  });
});

utils.queryElementNonNull('#site-pane-details-back-button').addEventListener('click', () => {
  sitesElement.dataset.activeContent = 'sites';
});

utils.queryElementNonNull('#menu-item-sites').addEventListener('click', () => {
  sitesElement.dataset.activeContent = 'sites';
});

utils.queryElementNonNull('#help-done-button').addEventListener('click', () => {
  setFirstPartyIsolate(inputFirstPartyIsolate.checked);
  renderInBackground();
  location.hash = '#main';
});


searchBox.focus();
searchBox.placeholder = browser.i18n.getMessage('searchPlaceholder');
searchBox.addEventListener('input', () => {
  const rawValue = searchBox.value;
  const values = rawValue.trim().split(/\s+/u).map((value) => value.trim()).filter((value) => !!value);
  if (values.length) {
    const containers = menuListElement.querySelectorAll<MenulistContainerElement>('menulist-container');
    for (const container of containers) {
      const name = container.containerName.toLowerCase();
      let matched = false;
      for (const searchString of values) {
        if (name.includes(searchString.toLowerCase())) {
          matched = true;
          break;
        }
      }
      if (matched) {
        container.classList.add('search-matched');
      } else {
        container.classList.remove('search-matched');
      }
    }
    menuListElement.classList.add('search-result');
  } else {
    menuListElement.classList.remove('search-result');
  }
});

// keyboard handlers
renderer.modalRenderer.pushKeyHandlers(okHandler, cancelHandler, keyHandler);

browser.tabs.onActivated.addListener(renderInBackground);
browser.tabs.onUpdated.addListener(renderInBackground);
browser.tabs.onCreated.addListener(renderInBackground);
browser.tabs.onRemoved.addListener(renderInBackground);
browser.tabs.onMoved.addListener(renderInBackground);
browser.tabs.onAttached.addListener(renderInBackground);
browser.tabs.onDetached.addListener(renderInBackground);
browser.tabs.onReplaced.addListener(renderInBackground);
browser.windows.onCreated.addListener(renderInBackground);
browser.windows.onRemoved.addListener(renderInBackground);
browser.contextualIdentities.onCreated.addListener(renderInBackground);
browser.contextualIdentities.onUpdated.addListener(renderInBackground);
browser.contextualIdentities.onRemoved.addListener(renderInBackground);

userContextSortingOrderStore.onChanged.addListener(renderInBackground);

renderInBackground();
