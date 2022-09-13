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
import { TEMPLATE } from './PopupTemplate';
import { config } from '../config/config';
import { MenulistContainerElement } from '../components/menulist-container';
import { PopupUtils } from './PopupUtils';
import '../components/usercontext-colorpicker';
import '../components/usercontext-iconpicker';

document.body.innerHTML = TEMPLATE; // static string.

const utils = new PopupUtils();

const renderer = new PopupRenderer();

const renderInBackground = () => {
  renderer.render().catch((e) => {
    console.error(e);
  });
};

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');
document.title = browser.i18n.getMessage('browserActionPopupTitle');
utils.queryElementNonNull<HTMLElement>('#button-panorama > .button-text').textContent = browser.i18n.getMessage('buttonPanorama');
utils.queryElementNonNull<HTMLElement>('#button-panorama').title = browser.i18n.getMessage('buttonPanorama');
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
utils.queryElementNonNull<HTMLElement>('#menu-item-main > .button-text').textContent = browser.i18n.getMessage('menuItemMain');
utils.queryElementNonNull<HTMLElement>('#menu-item-windows > .button-text').textContent = browser.i18n.getMessage('menuItemWindows');
utils.queryElementNonNull<HTMLElement>('#menu-item-sites > .button-text').textContent = browser.i18n.getMessage('menuItemSites');
utils.queryElementNonNull<HTMLElement>('#menu-item-settings > .button-text').textContent = browser.i18n.getMessage('buttonSettings');
utils.queryElementNonNull<HTMLElement>('#button-new-window > .button-text').textContent = browser.i18n.getMessage('buttonNewWindow');

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

utils.queryElementNonNull<HTMLButtonElement>('#menu-item-settings').addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.openOptionsPage();
});

utils.queryElementNonNull<HTMLButtonElement>('#button-panorama').addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.openPanoramaPage();
});

utils.queryElementNonNull<HTMLButtonElement>('#button-sidebar').addEventListener('click', (ev) => {
  ev.preventDefault();
  utils.openSidebar();
});

utils.queryElementNonNull<HTMLButtonElement>('#button-new-container').addEventListener('click', () => {
  renderer.showNewContainerPanelAsync().then((result) => {
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

renderInBackground();