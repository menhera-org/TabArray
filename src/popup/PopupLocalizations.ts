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
import { PopupUtils } from './PopupUtils';

const utils = new PopupUtils();

const extensionManifest = browser.runtime.getManifest();

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');
document.title = browser.i18n.getMessage('browserActionPopupTitle');

utils.queryElementNonNull<HTMLElement>('#button-panorama > .button-text').textContent = browser.i18n.getMessage('buttonPanorama');
utils.queryElementNonNull<HTMLElement>('#button-panorama').title = browser.i18n.getMessage('buttonPanorama');
utils.queryElementNonNull<HTMLElement>('#button-cookies > .button-text').textContent = browser.i18n.getMessage('tooltipCookies');
utils.queryElementNonNull<HTMLElement>('#button-about-addon > .button-text').textContent = browser.i18n.getMessage('buttonAboutAddon');
utils.queryElementNonNull<HTMLElement>('#button-sidebar > .button-text').textContent = browser.i18n.getMessage('buttonSidebar');
utils.queryElementNonNull<HTMLElement>('#button-sidebar').title = browser.i18n.getMessage('buttonSidebar');
utils.queryElementNonNull<HTMLElement>('#button-new-container > .button-text').textContent = browser.i18n.getMessage('buttonNewContainer');
utils.queryElementNonNull<HTMLElement>('#button-new-container').title = browser.i18n.getMessage('buttonNewContainer');
utils.queryElementNonNull<HTMLElement>('#button-new-temporary-container > .button-text').textContent = browser.i18n.getMessage('buttonNewTemporaryContainer');
utils.queryElementNonNull<HTMLElement>('#button-new-temporary-container').title = browser.i18n.getMessage('buttonNewTemporaryContainer');
utils.queryElementNonNull<HTMLElement>('#button-settings > .button-text').textContent = browser.i18n.getMessage('buttonSettings');
utils.queryElementNonNull<HTMLElement>('#button-settings').title = browser.i18n.getMessage('buttonSettings');
utils.queryElementNonNull<HTMLElement>('#confirm-cancel-button').textContent = browser.i18n.getMessage('buttonCancel');
utils.queryElementNonNull<HTMLElement>('#confirm-ok-button').textContent = browser.i18n.getMessage('buttonOk');

utils.queryElementNonNull<HTMLElement>('#help-done-button').textContent = browser.i18n.getMessage('buttonGetStarted');

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
utils.queryElementNonNull<HTMLElement>('#menu-item-help > .button-text').textContent = browser.i18n.getMessage('menuItemHelp');

utils.queryElementNonNull<HTMLElement>('#button-new-window').title = browser.i18n.getMessage('buttonNewWindow');
utils.queryElementNonNull<HTMLElement>('#button-new-private-window').title = browser.i18n.getMessage('buttonNewPrivateWindow');

utils.queryElementNonNull<HTMLElement>('#help-banner-description').textContent = browser.i18n.getMessage('extensionDescription');
utils.queryElementNonNull<HTMLElement>('#help-banner-version').textContent = extensionManifest.version;
utils.queryElementNonNull<HTMLElement>('#help-banner-heading').textContent = extensionManifest.name;
utils.queryElementNonNull<HTMLElement>('#help-banner-amo-link').textContent = browser.i18n.getMessage('buttonAboutAddon');
utils.queryElementNonNull<HTMLElement>('#help-banner-privacy-policy').textContent = browser.i18n.getMessage('privacyPolicy');

utils.queryElementNonNull<HTMLElement>('#fpiDescription').textContent = browser.i18n.getMessage('fpiDescription');
utils.queryElementNonNull<HTMLElement>('label[for="input-firstPartyIsolate"]').textContent = browser.i18n.getMessage('labelFirstPartyIsolate');

utils.queryElementNonNull<HTMLElement>('#optionalFeaturesDescription').textContent = browser.i18n.getMessage('optionalFeaturesDescription');
utils.queryElementNonNull<HTMLElement>('label[for="input-featureLanguageOverrides"]').textContent = browser.i18n.getMessage('featureLanguageOverrides');
utils.queryElementNonNull<HTMLElement>('label[for="input-featureUaOverrides"]').textContent = browser.i18n.getMessage('featureUaOverrides');
