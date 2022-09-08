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
import { config, ExternalContainerOption, GroupIndexOption, PopupSize, privacyConfig, BrowserBooleanSetting } from '../config/config';
import { StorageConfigurationOption, ConfigurationOption } from '../frameworks/config';

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');

const setTextContent = (query: string, message: string) => {
  const element = document.querySelector(query);
  if (!element) {
    throw new Error(`Missing element: ${query}`);
  }
  element.textContent = browser.i18n.getMessage(message);
};

const setConfigValue = <T,>(option: ConfigurationOption<T>, value: T) => {
  option.setValue(value).catch((e) => {
    console.error(e);
  });
};

setTextContent('#optionsHeadingExperimental', 'optionsHeadingExperimental');
setTextContent('#optionsHeadingFirefox', 'optionsHeadingFirefox');
setTextContent('#optionsDescriptionExperimental', 'optionsDescriptionExperimental');
setTextContent('#optionsDescriptionFirefox', 'optionsDescriptionFirefox');

const inputNewTabKeepContainer = document.querySelector<HTMLInputElement>('#input-newtabKeepContainer');
setTextContent('label[for="input-newtabKeepContainer"]', 'labelNewTabKeepContainer');

const inputFirstPartyIsolate = document.querySelector<HTMLInputElement>('#input-firstPartyIsolate');
setTextContent('label[for="input-firstPartyIsolate"]', 'labelFirstPartyIsolate');

const inputResistFingerprinting = document.querySelector<HTMLInputElement>('#input-resistFingerprinting');
setTextContent('label[for="input-resistFingerprinting"]', 'labelResistFingerprinting');

const selectExternalTabContainerOption = document.querySelector<HTMLSelectElement>('#select-externalTabContainerOption');
setTextContent('label[for="select-externalTabContainerOption"]', 'labelExternalTabSelectContainerOption');

setTextContent('#select-externalTabContainerOption > option[value="choose"]', 'labelExternalTabOptionChooseContainer');
setTextContent('#select-externalTabContainerOption > option[value="sticky"]', 'labelExternalTabOptionStickyContainer');
setTextContent('#select-externalTabContainerOption > option[value="disabled"]', 'labelExternalTabOptionDisabled');

const selectGroupIndexOption = document.querySelector<HTMLSelectElement>('#select-groupIndexOption');
setTextContent('label[for="select-groupIndexOption"]', 'labelGroupIndexOption');

setTextContent('#select-groupIndexOption > option[value="always"]', 'labelGroupIndexOptionAlways');
setTextContent('#select-groupIndexOption > option[value="collapsed"]', 'labelGroupIndexOptionCollapsed');
setTextContent('#select-groupIndexOption > option[value="never"]', 'labelGroupIndexOptionNever');


setTextContent('#optionsHeadingAppearance', 'optionsHeadingAppearance');

const selectPopupSize = document.querySelector<HTMLSelectElement>('#select-popupSize');
setTextContent('label[for="select-popupSize"]', 'labelPopupSize');

setTextContent('#select-popupSize > option[value="standard"]', 'labelPopupSizeStandard');
setTextContent('#select-popupSize > option[value="large"]', 'labelPopupSizeLarge');

// newtab.keepContainer setting
config['newtab.keepContainer'].observe((value) => {
  inputNewTabKeepContainer!.checked = value;
});

inputNewTabKeepContainer?.addEventListener('change', (ev) => {
  setConfigValue(config['newtab.keepContainer'], inputNewTabKeepContainer.checked);
});

// tab.external.containerOption setting
config['tab.external.containerOption'].observe((value) => {
  selectExternalTabContainerOption!.value = value;
});

selectExternalTabContainerOption?.addEventListener('change', (ev) => {
  setConfigValue(config['tab.external.containerOption'], selectExternalTabContainerOption.value as ExternalContainerOption);
});

// tab.groups.indexOption setting
config['tab.groups.indexOption'].observe((value) => {
  selectGroupIndexOption!.value = value;
});

selectGroupIndexOption?.addEventListener('change', (ev) => {
  setConfigValue(config['tab.groups.indexOption'], selectGroupIndexOption.value as GroupIndexOption);
});

// appearance.popupSize setting
config['appearance.popupSize'].observe((value) => {
  selectPopupSize!.value = value;
});

selectPopupSize?.addEventListener('change', (ev) => {
  setConfigValue(config['appearance.popupSize'], selectPopupSize.value as PopupSize);
});

privacyConfig.firstPartyIsolate.observe((value) => {
  inputFirstPartyIsolate!.checked = value;
});

inputFirstPartyIsolate?.addEventListener('change', (ev) => {
  setConfigValue(privacyConfig.firstPartyIsolate, inputFirstPartyIsolate.checked);
});

privacyConfig.resistFingerprinting.observe((value) => {
  inputResistFingerprinting!.checked = value;
});

inputResistFingerprinting?.addEventListener('change', (ev) => {
  setConfigValue(privacyConfig.resistFingerprinting, inputResistFingerprinting.checked);
});
