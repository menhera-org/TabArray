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
import { config } from '../config/config';
import { MenulistContainerElement } from '../components/menulist-container';
import { PopupUtils } from './PopupUtils';
import '../components/usercontext-colorpicker';
import '../components/usercontext-iconpicker';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';
import { ExtensionService } from '../frameworks/extension';
import { cancelHandler, okHandler, keyHandler } from './PopupKeyHandlers';

const utils = new PopupUtils();
const userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();
const extensionService = ExtensionService.getInstance();

const renderer = new PopupRenderer();

const renderInBackground = () => {
  renderer.render().catch((e) => {
    console.error(e);
  });
};

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');
document.title = browser.i18n.getMessage('browserActionPopupTitle');
utils.queryElementNonNull<HTMLElement>('#button-panorama > .button-text').textContent = browser.i18n.getMessage('buttonPanorama');
utils.queryElementNonNull<HTMLElement>('#button-cookies > .button-text').textContent = browser.i18n.getMessage('tooltipCookies');
utils.queryElementNonNull<HTMLElement>('#button-about-addon > .button-text').textContent = browser.i18n.getMessage('buttonAboutAddon');
utils.queryElementNonNull<HTMLElement>('#button-sidebar > .button-text').textContent = browser.i18n.getMessage('buttonSidebar');
utils.queryElementNonNull<HTMLElement>('#button-sidebar').title = browser.i18n.getMessage('buttonSidebar');
utils.queryElementNonNull<HTMLElement>('#button-new-container > .button-text').textContent = browser.i18n.getMessage('buttonNewContainer');
utils.queryElementNonNull<HTMLElement>('#button-new-container').title = browser.i18n.getMessage('buttonNewContainer');
utils.queryElementNonNull<HTMLElement>('#confirm-cancel-button').textContent = browser.i18n.getMessage('buttonCancel');
utils.queryElementNonNull<HTMLElement>('#confirm-ok-button').textContent = browser.i18n.getMessage('buttonOk');

utils.queryElementNonNull<HTMLElement>('#new-container-cancel-button').textContent = browser.i18n.getMessage('buttonCancel');
utils.queryElementNonNull<HTMLElement>('#new-container-ok-button').textContent = browser.i18n.getMessage('buttonOk');
utils.queryElementNonNull<HTMLElement>('label[for="new-container-name"]').textContent = browser.i18n.getMessage('newContainerNameLabel');
utils.queryElementNonNull<HTMLInputElement>('#new-container-name').placeholder = browser.i18n.getMessage('newContainerNamePlaceholder');

utils.queryElementNonNull<HTMLElement>('#container-menu-edit-button').textContent = browser.i18n.getMessage('buttonEditContainer');
utils.queryElementNonNull<HTMLElement>('#container-menu-clear-cookie-button').textContent = browser.i18n.getMessage('buttonContainerClearCookie');
utils.queryElementNonNull<HTMLElement>('#container-menu-delete-button').textContent = browser.i18n.getMessage('buttonDeleteContainer');
utils.queryElementNonNull<HTMLElement>('#container-menu-done-button').textContent = browser.i18n.getMessage('buttonDone');

utils.queryElementNonNull<HTMLElement>('#menu-item-main > .button-text').textContent = browser.i18n.getMessage('menuItemMain');
utils.queryElementNonNull<HTMLElement>('#menu-item-windows > .button-text').textContent = browser.i18n.getMessage('menuItemWindows');
utils.queryElementNonNull<HTMLElement>('#menu-item-sites > .button-text').textContent = browser.i18n.getMessage('menuItemSites');
utils.queryElementNonNull<HTMLElement>('#menu-item-settings > .button-text').textContent = browser.i18n.getMessage('buttonSettings');
utils.queryElementNonNull<HTMLElement>('#button-new-window > .button-text').textContent = browser.i18n.getMessage('buttonNewWindow');
utils.queryElementNonNull<HTMLElement>('#button-new-private-window > .button-text').textContent = browser.i18n.getMessage('buttonNewPrivateWindow');

const sitesElement = utils.queryElementNonNull<HTMLElement>('#sites');

location.hash = '#main';
document.body.dataset.activeContent = 'main';
window.addEventListener('hashchange', () => {
  document.body.dataset.activeContent = location.hash.slice(1);
});

let configPopupSize;
config['appearance.popupSize'].observe((value) => {
  configPopupSize = value;
  if (configPopupSize == 'large') {
    document.body.classList.add('large');
  }
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

buttonNewPrivateWindow.addEventListener('click', () => {
  utils.openNewWindow(true);
});

utils.queryElementNonNull<HTMLButtonElement>('#menu-item-settings').addEventListener('click', (ev) => {
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
  utils.openSidebar();
});

utils.queryElementNonNull<HTMLButtonElement>('#button-new-container').addEventListener('click', () => {
  renderer.modalRenderer.showNewContainerPanelAsync().then((result) => {
    if (!result) return;
    console.log('Created new container', result);
  });
});

utils.queryElementNonNull('#site-pane-details-back-button').addEventListener('click', () => {
  sitesElement.dataset.activeContent = 'sites';
});

utils.queryElementNonNull('#menu-item-sites').addEventListener('click', () => {
  sitesElement.dataset.activeContent = 'sites';
});

const searchBox = utils.queryElementNonNull<HTMLInputElement>('#search');
const menuListElement = utils.queryElementNonNull<HTMLElement>('#menuList');

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
