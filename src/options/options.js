// vim: ts=2 sw=2 et ai
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

import browser from 'webextension-polyfill';
import '../modules/background-console.js';
import {config} from '../modules/config.js';
import { getFirstpartyManager } from '../modules/global-state.js';

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');

document.querySelector('#optionsHeadingExperimental').textContent = browser.i18n.getMessage('optionsHeadingExperimental');
document.querySelector('#optionsHeadingFirefox').textContent = browser.i18n.getMessage('optionsHeadingFirefox');
document.querySelector('#optionsHeadingUserData').textContent = browser.i18n.getMessage('optionsHeadingUserData');
document.querySelector('#optionsDescriptionExperimental').textContent = browser.i18n.getMessage('optionsDescriptionExperimental');
document.querySelector('#optionsDescriptionFirefox').textContent = browser.i18n.getMessage('optionsDescriptionFirefox');

const inputNewTabKeepContainer = document.querySelector('#input-newtabKeepContainer');
document.querySelector('label[for="input-newtabKeepContainer"]').textContent = browser.i18n.getMessage('labelNewTabKeepContainer');

const inputFirstPartyIsolate = document.querySelector('#input-firstPartyIsolate');
document.querySelector('label[for="input-firstPartyIsolate"]').textContent = browser.i18n.getMessage('labelFirstPartyIsolate');

const inputResistFingerprinting = document.querySelector('#input-resistFingerprinting');
document.querySelector('label[for="input-resistFingerprinting"]').textContent = browser.i18n.getMessage('labelResistFingerprinting');

const selectExternalTabContainerOption = document.querySelector('#select-externalTabContainerOption');
document.querySelector('label[for="select-externalTabContainerOption"]').textContent = browser.i18n.getMessage('labelExternalTabSelectContainerOption');

document.querySelector('#select-externalTabContainerOption > option[value="choose"]').textContent = browser.i18n.getMessage('labelExternalTabOptionChooseContainer');
document.querySelector('#select-externalTabContainerOption > option[value="sticky"]').textContent = browser.i18n.getMessage('labelExternalTabOptionStickyContainer');
document.querySelector('#select-externalTabContainerOption > option[value="disabled"]').textContent = browser.i18n.getMessage('labelExternalTabOptionDisabled');

const selectGroupIndexOption = document.querySelector('#select-groupIndexOption');
document.querySelector('label[for="select-groupIndexOption"]').textContent = browser.i18n.getMessage('labelGroupIndexOption');

document.querySelector('#select-groupIndexOption > option[value="always"]').textContent = browser.i18n.getMessage('labelGroupIndexOptionAlways');
document.querySelector('#select-groupIndexOption > option[value="collapsed"]').textContent = browser.i18n.getMessage('labelGroupIndexOptionCollapsed');
document.querySelector('#select-groupIndexOption > option[value="never"]').textContent = browser.i18n.getMessage('labelGroupIndexOptionNever');


document.querySelector('#optionsHeadingAppearance').textContent = browser.i18n.getMessage('optionsHeadingAppearance');

const selectPopupSize = document.querySelector('#select-popupSize');
document.querySelector('label[for="select-popupSize"]').textContent = browser.i18n.getMessage('labelPopupSize');

document.querySelector('#select-popupSize > option[value="standard"]').textContent = browser.i18n.getMessage('labelPopupSizeStandard');
document.querySelector('#select-popupSize > option[value="large"]').textContent = browser.i18n.getMessage('labelPopupSizeLarge');

const buttonClearRecentSites = document.querySelector('#button-clearRecentSites');
buttonClearRecentSites.textContent = browser.i18n.getMessage('buttonClear');
document.querySelector('label[for="button-clearRecentSites"]').textContent = browser.i18n.getMessage('labelClearRecentSites');

getFirstpartyManager().then((FirstpartyManager) => {
  globalThis.FirstpartyManager = FirstpartyManager;
});

buttonClearRecentSites.addEventListener('click', (ev) => {
  FirstpartyManager.clearData().then(() => {
    console.log('Cleared the list of visited sites');
  }).catch((e) => {
    console.error(e);
  });
});

config.observe('newtab.keepContainer', (value) => {
  if (undefined === value) {
    config.set('newtab.keepContainer', true);
    return;
  }
  inputNewTabKeepContainer.checked = value;
});

inputNewTabKeepContainer.addEventListener('change', (ev) => {
  config.set('newtab.keepContainer', ev.target.checked)
  .catch(e => console.error(e));
});

config.observe('tab.external.containerOption', (value) => {
  if (undefined === value) {
    return;
  }
  selectExternalTabContainerOption.value = value;
});

selectExternalTabContainerOption.addEventListener('change', (ev) => {
  config.set('tab.external.containerOption', ev.target.value)
  .catch(e => console.error(e));
});

config.observe('tab.groups.indexOption', (value) => {
  if (undefined === value) {
    return;
  }
  selectGroupIndexOption.value = value;
});

selectGroupIndexOption.addEventListener('change', (ev) => {
  config.set('tab.groups.indexOption', ev.target.value)
  .catch(e => console.error(e));
});

browser.privacy.websites.firstPartyIsolate.get({}).then((details) => {
  inputFirstPartyIsolate.checked = details.value;
});

browser.privacy.websites.firstPartyIsolate.onChange.addListener((details) => {
  inputFirstPartyIsolate.checked = details.value;
});

inputFirstPartyIsolate.addEventListener('change', (ev) => {
  browser.privacy.websites.firstPartyIsolate.set({
    value: ev.target.checked,
  }).catch((e) => console.error(e));
});

browser.privacy.websites.resistFingerprinting.get({}).then((details) => {
  inputResistFingerprinting.checked = details.value;
});

browser.privacy.websites.resistFingerprinting.onChange.addListener((details) => {
  inputResistFingerprinting.checked = details.value;
});

inputResistFingerprinting.addEventListener('change', (ev) => {
  browser.privacy.websites.resistFingerprinting.set({
    value: ev.target.checked,
  }).catch((e) => console.error(e));
});

config.observe('appearance.popupSize', (value) => {
  if (undefined === value) {
    return;
  }
  selectPopupSize.value = value;
});

selectPopupSize.addEventListener('change', (ev) => {
  config.set('appearance.popupSize', ev.target.value)
  .catch((e) => console.error(e));
});
