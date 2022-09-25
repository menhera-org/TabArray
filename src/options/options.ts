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
import { config, ExternalContainerOption, GroupIndexOption, PopupSize, privacyConfig } from '../config/config';
import { ConfigurationOption } from '../frameworks/config';
import { ContainerSorterElement } from '../components/container-sorter';
import { UserContext } from '../frameworks/tabGroups';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';
import { UserContextService } from '../userContexts/UserContextService';
import { CookieAutocleanService } from '../cookies/CookieAutocleanService';

interface HTMLFormInput extends HTMLElement {
  value: string;
}

const sortingOrderStore = UserContextSortingOrderStore.getInstance();
const userContextService = UserContextService.getInstance();
const cookieAutocleanService = CookieAutocleanService.getInstance();

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

const setFormInputValue = (inputElement: HTMLFormInput | null | undefined, value: string) => {
  if (!inputElement) {
    throw new Error('Missing input element');
  }
  inputElement.value = value;
};

const setInputChecked = (inputElement: HTMLInputElement | null | undefined, value: boolean) => {
  if (!inputElement) {
    throw new Error('Missing input element');
  }
  inputElement.checked = value;
};

setTextContent('#optionsHeadingExperimental', 'optionsHeadingExperimental');
setTextContent('#optionsHeadingFirefox', 'optionsHeadingFirefox');
setTextContent('#optionsDescriptionExperimental', 'optionsDescriptionExperimental');
setTextContent('#optionsDescriptionFirefox', 'optionsDescriptionFirefox');
setTextContent('#optionsHeadingContainerSortOrder', 'optionsHeadingContainerSortOrder');
setTextContent('#optionsDescriptionContainerSortOrder', 'optionsDescriptionContainerSortOrder');

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

UserContext.getAll().then(async (userContexts) => {
  const autocleanEnabledUserContextIds = await cookieAutocleanService.getAutocleanEnabledUserContexts();
  const sortedUserContext = sortingOrderStore.sort(userContexts.map((userContext) => userContextService.fillDefaultValues(userContext)));
  const containerSorter = new ContainerSorterElement(sortedUserContext, autocleanEnabledUserContextIds);
  document.body?.appendChild(containerSorter);

  const callback = async () => {
    const autocleanEnabledUserContextIds = await cookieAutocleanService.getAutocleanEnabledUserContexts();
    const userContexts = (await UserContext.getAll()).map((userContext) => userContextService.fillDefaultValues(userContext));
    const sortedUserContext = sortingOrderStore.sort(userContexts);
    containerSorter.setUserContexts(sortedUserContext, autocleanEnabledUserContextIds);
  };

  sortingOrderStore.onChanged.addListener(callback);
  UserContext.onCreated.addListener(callback);
  UserContext.onRemoved.addListener(callback);
  UserContext.onUpdated.addListener(callback);

  containerSorter.onChanged.addListener((sortOrder) => {
    sortingOrderStore.setOrder(sortOrder);
  });
});

// newtab.keepContainer setting
config['newtab.keepContainer'].observe((value) => {
  setInputChecked(inputNewTabKeepContainer, value);
});

inputNewTabKeepContainer?.addEventListener('change', () => {
  setConfigValue(config['newtab.keepContainer'], inputNewTabKeepContainer.checked);
});

// tab.external.containerOption setting
config['tab.external.containerOption'].observe((value) => {
  setFormInputValue(selectExternalTabContainerOption, value);
});

selectExternalTabContainerOption?.addEventListener('change', () => {
  setConfigValue(config['tab.external.containerOption'], selectExternalTabContainerOption.value as ExternalContainerOption);
});

// tab.groups.indexOption setting
config['tab.groups.indexOption'].observe((value) => {
  setFormInputValue(selectGroupIndexOption, value);
});

selectGroupIndexOption?.addEventListener('change', () => {
  setConfigValue(config['tab.groups.indexOption'], selectGroupIndexOption.value as GroupIndexOption);
});

// appearance.popupSize setting
config['appearance.popupSize'].observe((value) => {
  setFormInputValue(selectPopupSize, value);
});

selectPopupSize?.addEventListener('change', () => {
  setConfigValue(config['appearance.popupSize'], selectPopupSize.value as PopupSize);
});

privacyConfig.firstPartyIsolate.observe((value) => {
  setInputChecked(inputFirstPartyIsolate, value);
});

inputFirstPartyIsolate?.addEventListener('change', () => {
  setConfigValue(privacyConfig.firstPartyIsolate, inputFirstPartyIsolate.checked);
});

privacyConfig.resistFingerprinting.observe((value) => {
  setInputChecked(inputResistFingerprinting, value);
});

inputResistFingerprinting?.addEventListener('change', () => {
  setConfigValue(privacyConfig.resistFingerprinting, inputResistFingerprinting.checked);
});
