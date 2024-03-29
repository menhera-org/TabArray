/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
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
  @license
**/

import browser from 'webextension-polyfill';

import { ConfigurationOption } from '../../lib/config/ConfigurationOption';
import { FpiService } from '../../lib/config/FpiService';
import { CompatConsole } from '../../lib/console/CompatConsole';

import { config, ExternalContainerOption, GroupIndexOption, PopupSize, privacyConfig } from '../../config/config';

import { TabGroupSorterElement } from '../../components/tab-group-sorter';
import { TabGroupOverridesElement } from '../../components/tab-group-overrides';
import { HelpBannerElement } from '../../components/help-banner';
import { ProxyManagerElement } from '../../components/proxy-manager';
import { TabGroupProxyElement } from '../../components/tab-group-proxy';

import './options-i18n';

interface HTMLFormInput extends HTMLElement {
  value: string;
}

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const fpiService = FpiService.getInstance();

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
const paneTabs = document.querySelectorAll<HTMLElement>('#pane-tabs > .pane-tab');
const setActiveContent = (name: string) => {
  name = name || 'general';
  // console.log('setActiveContent', name);
  for (const pane of panes) {
    if (pane.dataset.paneName === name) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  }
  for (const paneTab of paneTabs) {
    if (paneTab.dataset.paneName === name) {
      paneTab.classList.add('selected');
    } else {
      paneTab.classList.remove('selected');
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

const inputTabSortingEnabled = document.querySelector<HTMLInputElement>('#input-enableSorting');
const inputSyncContainers = document.querySelector<HTMLInputElement>('#input-syncContainers');
const inputAutoHideContainers = document.querySelector<HTMLInputElement>('#input-autoHideContainers');

const inputFeatureLanguageOverrides = document.querySelector<HTMLInputElement>('#input-featureLanguageOverrides');
const inputFeatureUaOverrides = document.querySelector<HTMLInputElement>('#input-featureUaOverrides');
const inputFeaturePerContainerProxy = document.querySelector<HTMLInputElement>('#input-featurePerContainerProxy');

const inputNewTabKeepContainer = document.querySelector<HTMLInputElement>('#input-newtabKeepContainer');
const inputFirstPartyIsolate = document.querySelector<HTMLInputElement>('#input-firstPartyIsolate');
const inputResistFingerprinting = document.querySelector<HTMLInputElement>('#input-resistFingerprinting');

const selectExternalTabContainerOption = document.querySelector<HTMLSelectElement>('#select-externalTabContainerOption');
const selectGroupIndexOption = document.querySelector<HTMLSelectElement>('#select-groupIndexOption');
const selectPopupSize = document.querySelector<HTMLSelectElement>('#select-popupSize');

const selectAutoDiscardMinAge = document.querySelector<HTMLSelectElement>('#select-autoDiscardMinAge');

const paneHelp = document.querySelector<HTMLElement>('#optionsPanes > div[data-pane-name="help"]');

const paneProxies = document.querySelector<HTMLElement>('#optionsPanes > div[data-pane-name="proxies"]');

const tabGroupSorter = new TabGroupSorterElement();
paneContainers?.appendChild(tabGroupSorter);

const tabGroupOverrides = new TabGroupOverridesElement();
paneContainerOverrides?.appendChild(tabGroupOverrides);

const tabGroupProxy = new TabGroupProxyElement();
paneProxies?.querySelector('#proxy-settings')?.appendChild(tabGroupProxy);

const proxyManager = new ProxyManagerElement();
paneProxies?.appendChild(proxyManager);

const helpBanner = new HelpBannerElement();
paneHelp?.appendChild(helpBanner);

// tab.sorting.enabled setting
config['tab.sorting.enabled'].observe((value) => {
  setInputChecked(inputTabSortingEnabled, value);
});

inputTabSortingEnabled?.addEventListener('change', () => {
  setConfigValue(config['tab.sorting.enabled'], inputTabSortingEnabled.checked);
});

// feature.syncContainers setting
config['feature.syncContainers'].observe((value) => {
  setInputChecked(inputSyncContainers, value);
});

inputSyncContainers?.addEventListener('change', () => {
  setConfigValue(config['feature.syncContainers'], inputSyncContainers.checked);
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
  fpiService.setFirstPartyIsolate(inputFirstPartyIsolate.checked).catch((e) => {
    console.error(e);
  });
});

privacyConfig.resistFingerprinting.observe((value) => {
  setInputChecked(inputResistFingerprinting, value);
});

inputResistFingerprinting?.addEventListener('change', () => {
  setConfigValue(privacyConfig.resistFingerprinting, inputResistFingerprinting.checked);
});

// tab.autoDiscard.minAge setting
config['tab.autoDiscard.minAge'].observe((value) => {
  setFormInputValue(selectAutoDiscardMinAge, value.toFixed(0));
});

selectAutoDiscardMinAge?.addEventListener('change', () => {
  setConfigValue(config['tab.autoDiscard.minAge'], parseInt(selectAutoDiscardMinAge.value, 10));
});

config['feature.containerProxy'].observe((value) => {
  setInputChecked(inputFeaturePerContainerProxy, value);
});

inputFeaturePerContainerProxy?.addEventListener('change', () => {
  setConfigValue(config['feature.containerProxy'], inputFeaturePerContainerProxy.checked);
});

config['tab.autoHide.enabled'].observe((value) => {
  setInputChecked(inputAutoHideContainers, value);
});

inputAutoHideContainers?.addEventListener('change', () => {
  setConfigValue(config['tab.autoHide.enabled'], inputAutoHideContainers.checked);
});
