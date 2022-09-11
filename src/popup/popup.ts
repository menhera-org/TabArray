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

document.body.innerHTML = TEMPLATE; // static string.

const renderer = new PopupRenderer();
renderer.render().catch((e) => {
  console.error(e);
});

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');
document.title = browser.i18n.getMessage('browserActionPopupTitle');
document.querySelector<HTMLElement>('#button-panorama > .button-text')!.textContent = browser.i18n.getMessage('buttonPanorama');
document.querySelector<HTMLElement>('#button-panorama')!.title = browser.i18n.getMessage('buttonPanorama');
document.querySelector<HTMLElement>('#button-sidebar > .button-text')!.textContent = browser.i18n.getMessage('buttonSidebar');
document.querySelector<HTMLElement>('#button-sidebar')!.title = browser.i18n.getMessage('buttonSidebar');
document.querySelector<HTMLElement>('#button-new-container > .button-text')!.textContent = browser.i18n.getMessage('buttonNewContainer');
document.querySelector<HTMLElement>('#button-new-container')!.title = browser.i18n.getMessage('buttonNewContainer');
document.querySelector<HTMLElement>('#confirm-cancel-button')!.textContent = browser.i18n.getMessage('buttonCancel');
document.querySelector<HTMLElement>('#confirm-ok-button')!.textContent = browser.i18n.getMessage('buttonOk');
document.querySelector<HTMLElement>('#new-container-cancel-button')!.textContent = browser.i18n.getMessage('buttonCancel');
document.querySelector<HTMLElement>('#new-container-ok-button')!.textContent = browser.i18n.getMessage('buttonOk');
document.querySelector<HTMLElement>('label[for="new-container-name"]')!.textContent = browser.i18n.getMessage('newContainerNameLabel');
document.querySelector<HTMLInputElement>('#new-container-name')!.placeholder = browser.i18n.getMessage('newContainerNamePlaceholder');
document.querySelector<HTMLElement>('#menu-item-main > .button-text')!.textContent = browser.i18n.getMessage('menuItemMain');
document.querySelector<HTMLElement>('#menu-item-windows > .button-text')!.textContent = browser.i18n.getMessage('menuItemWindows');
document.querySelector<HTMLElement>('#menu-item-sites > .button-text')!.textContent = browser.i18n.getMessage('menuItemSites');
document.querySelector<HTMLElement>('#menu-item-settings > .button-text')!.textContent = browser.i18n.getMessage('buttonSettings');
document.querySelector<HTMLElement>('#button-new-window > .button-text')!.textContent = browser.i18n.getMessage('buttonNewWindow');

const sitesElement = document.querySelector<HTMLElement>('#sites')!;

location.hash = '#main';
document.body.dataset.activeContent = 'main';
window.addEventListener('hashchange', (ev) => {
  document.body.dataset.activeContent = location.hash.slice(1);
});

let configPopupSize;
config['appearance.popupSize'].observe((value) => {
  configPopupSize = value;
  if (configPopupSize == 'large') {
    document.body.classList.add('large');
  }
});

document.querySelector<HTMLButtonElement>('#menu-item-settings')!.addEventListener('click', (ev) => {
  ev.preventDefault();
  browser.runtime.openOptionsPage().then(() => {
    window.close();
  }).catch((e) => console.error(e));
});

document.querySelector('#site-pane-details-back-button')!.addEventListener('click', ev => {
  sitesElement.dataset.activeContent = 'sites';
});

document.querySelector('#menu-item-sites')!.addEventListener('click', ev => {
  sitesElement.dataset.activeContent = 'sites';
});

const searchBox = document.querySelector<HTMLInputElement>('#search')!;
const menuListElement = document.querySelector('#menuList')!;

searchBox.focus();
searchBox.placeholder = browser.i18n.getMessage('searchPlaceholder');
searchBox.addEventListener('input', (ev) => {
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
