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
import { ContainerOverridesElement } from '../components/container-overrides';
import './options-i18n';

interface HTMLFormInput extends HTMLElement {
  value: string;
}

const sortingOrderStore = UserContextSortingOrderStore.getInstance();
const userContextService = UserContextService.getInstance();
const cookieAutocleanService = CookieAutocleanService.getInstance();

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');

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

const panes = document.querySelectorAll<HTMLElement>('#optionsPanes > div');
const setActiveContent = (name: string) => {
  name = name || 'general';
  console.log('setActiveContent', name);
  for (const pane of panes) {
    if (pane.dataset.paneName === name) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  }
};

setActiveContent(location.hash.slice(1));

window.addEventListener('hashchange', () => {
  const activeContent = location.hash.slice(1);
  setActiveContent(activeContent);
});

const paneContainers = document.querySelector<HTMLElement>('#optionsPanes > div[data-pane-name="containers"]');
const paneContainerOverrides = document.querySelector<HTMLElement>('#optionsPanes > div[data-pane-name="container-overrides"]');

const inputFeatureLanguageOverrides = document.querySelector<HTMLInputElement>('#input-featureLanguageOverrides');
const inputFeatureUaOverrides = document.querySelector<HTMLInputElement>('#input-featureUaOverrides');

const inputNewTabKeepContainer = document.querySelector<HTMLInputElement>('#input-newtabKeepContainer');
const inputFirstPartyIsolate = document.querySelector<HTMLInputElement>('#input-firstPartyIsolate');
const inputResistFingerprinting = document.querySelector<HTMLInputElement>('#input-resistFingerprinting');

const selectExternalTabContainerOption = document.querySelector<HTMLSelectElement>('#select-externalTabContainerOption');
const selectGroupIndexOption = document.querySelector<HTMLSelectElement>('#select-groupIndexOption');
const selectPopupSize = document.querySelector<HTMLSelectElement>('#select-popupSize');

UserContext.getAll().then(async (userContexts) => {
  const autocleanEnabledUserContextIds = await cookieAutocleanService.getAutocleanEnabledUserContexts();
  const sortedUserContext = sortingOrderStore.sort(userContexts.map((userContext) => userContextService.fillDefaultValues(userContext)));
  const containerSorter = new ContainerSorterElement(sortedUserContext, autocleanEnabledUserContextIds);
  paneContainers?.appendChild(containerSorter);

  const containerOverrides = new ContainerOverridesElement(sortedUserContext);
  paneContainerOverrides?.appendChild(containerOverrides);

  const callback = async () => {
    const autocleanEnabledUserContextIds = await cookieAutocleanService.getAutocleanEnabledUserContexts();
    const userContexts = (await UserContext.getAll()).map((userContext) => userContextService.fillDefaultValues(userContext));
    const sortedUserContext = sortingOrderStore.sort(userContexts);
    containerSorter.setUserContexts(sortedUserContext, autocleanEnabledUserContextIds);
    containerOverrides.setUserContexts(sortedUserContext);
  };

  sortingOrderStore.onChanged.addListener(callback);
  UserContext.onCreated.addListener(callback);
  UserContext.onRemoved.addListener(callback);
  UserContext.onUpdated.addListener(callback);

  containerSorter.onChanged.addListener((sortOrder) => {
    sortingOrderStore.setOrder(sortOrder);
  });
});

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
