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

import '../modules/background-console.mjs';
import {config} from '../modules/config.mjs';

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');

document.querySelector('#optionsHeadingExperimental').textContent = browser.i18n.getMessage('optionsHeadingExperimental');
document.querySelector('#optionsHeadingFirefox').textContent = browser.i18n.getMessage('optionsHeadingFirefox');
document.querySelector('#optionsDescriptionExperimental').textContent = browser.i18n.getMessage('optionsDescriptionExperimental');
document.querySelector('#optionsDescriptionFirefox').textContent = browser.i18n.getMessage('optionsDescriptionFirefox');

const inputNewTabKeepContainer = document.querySelector('#input-newtabKeepContainer');
document.querySelector('label[for="input-newtabKeepContainer"]').textContent = browser.i18n.getMessage('labelNewTabKeepContainer');

const inputFirstPartyIsolate = document.querySelector('#input-firstPartyIsolate');
document.querySelector('label[for="input-firstPartyIsolate"]').textContent = browser.i18n.getMessage('labelFirstPartyIsolate');

const inputResistFingerprinting = document.querySelector('#input-resistFingerprinting');
document.querySelector('label[for="input-resistFingerprinting"]').textContent = browser.i18n.getMessage('labelResistFingerprinting');

const inputDragTabToChangeContainer = document.querySelector('#input-dragTabToChangeContainer');
document.querySelector('label[for="input-dragTabToChangeContainer"]').textContent = browser.i18n.getMessage('labelDragTabToChangeContainer');

const inputSelectContainerExternalTabs = document.querySelector('#input-selectContainerExternalTabs');
document.querySelector('label[for="input-selectContainerExternalTabs"]').textContent = browser.i18n.getMessage('labelSelectContainerExternalTabs');

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

config.observe('gesture.dragTabBetweenContainers', (value) => {
  if (undefined === value) {
    config.set('gesture.dragTabBetweenContainers', true);
    return;
  }
  inputDragTabToChangeContainer.checked = value;
});

inputDragTabToChangeContainer.addEventListener('change', (ev) => {
  config.set('gesture.dragTabBetweenContainers', ev.target.checked)
  .catch(e => console.error(e));
});

config.observe('tab.external.chooseContainer', (value) => {
  console.log('value:', value);
  if (undefined === value) {
    config.set('tab.external.chooseContainer', true);
    return;
  }
  inputSelectContainerExternalTabs.checked = value;
});

inputSelectContainerExternalTabs.addEventListener('change', (ev) => {
  config.set('tab.external.chooseContainer', !!ev.target.checked)
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
