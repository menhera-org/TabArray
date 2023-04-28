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


document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');

const setTextContent = (query: string, message: string) => {
  const element = document.querySelector(query);
  if (!element) {
    throw new Error(`Missing element: ${query}`);
  }
  element.textContent = browser.i18n.getMessage(message);
};

// tabs
setTextContent('.pane-tab[data-pane-name="general"]', 'optionsTabGeneral');
setTextContent('.pane-tab[data-pane-name="containers"]', 'optionsTabSortContainers');
setTextContent('.pane-tab[data-pane-name="container-overrides"]', 'optionsTabContainerOverrides');
setTextContent('.pane-tab[data-pane-name="proxies"]', 'optionsTabProxies');
setTextContent('.pane-tab[data-pane-name="firefox-settings"]', 'optionsTabFirefoxSettings');
setTextContent('.pane-tab[data-pane-name="help"]', 'menuItemHelp');

setTextContent('#optionsHeadingGeneral', 'optionsHeadingGeneral');

setTextContent('label[for="select-autoDiscardMinAge"]', 'labelAutoDiscardMinAge');
setTextContent('#select-autoDiscardMinAge > option[value="-1"]', 'labelAutoDiscardDisabled');
setTextContent('#select-autoDiscardMinAge > option[value="900"]', 'labelAutoDiscard900');
setTextContent('#select-autoDiscardMinAge > option[value="1800"]', 'labelAutoDiscard1800');
setTextContent('#select-autoDiscardMinAge > option[value="3600"]', 'labelAutoDiscard3600');
setTextContent('#select-autoDiscardMinAge > option[value="10800"]', 'labelAutoDiscard10800');
setTextContent('#select-autoDiscardMinAge > option[value="21600"]', 'labelAutoDiscard21600');
setTextContent('#select-autoDiscardMinAge > option[value="43200"]', 'labelAutoDiscard43200');
setTextContent('#select-autoDiscardMinAge > option[value="86400"]', 'labelAutoDiscard86400');

setTextContent('#optionalFeaturesDescription', 'optionalFeaturesDescription');
setTextContent('#optionalFeaturesDescription_proxies', 'optionalFeaturesDescription');

setTextContent('label[for="input-featureLanguageOverrides"]', 'featureLanguageOverrides');
setTextContent('label[for="input-featureUaOverrides"]', 'featureUaOverrides');
setTextContent('label[for="input-featurePerContainerProxy"]', 'featurePerContainerProxy');

setTextContent('#optionsHeadingExperimental', 'optionsHeadingExperimental');
setTextContent('#optionsHeadingFirefox', 'optionsHeadingFirefox');
setTextContent('#optionsDescriptionExperimental', 'optionsDescriptionExperimental');
setTextContent('#optionsDescriptionFirefox', 'optionsDescriptionFirefox');
setTextContent('#fpiDescription', 'fpiDescription');
setTextContent('#optionsDescriptionContainerSortOrder', 'optionsDescriptionContainerSortOrder');

setTextContent('label[for="input-newtabKeepContainer"]', 'labelNewTabKeepContainer');

setTextContent('label[for="input-firstPartyIsolate"]', 'labelFirstPartyIsolate');

setTextContent('label[for="input-resistFingerprinting"]', 'labelResistFingerprinting');

setTextContent('label[for="select-externalTabContainerOption"]', 'labelExternalTabSelectContainerOption');

setTextContent('#select-externalTabContainerOption > option[value="choose"]', 'labelExternalTabOptionChooseContainer');
setTextContent('#select-externalTabContainerOption > option[value="sticky"]', 'labelExternalTabOptionStickyContainer');
setTextContent('#select-externalTabContainerOption > option[value="disabled"]', 'labelExternalTabOptionDisabled');

setTextContent('label[for="select-groupIndexOption"]', 'labelGroupIndexOption');

setTextContent('#select-groupIndexOption > option[value="always"]', 'labelGroupIndexOptionAlways');
setTextContent('#select-groupIndexOption > option[value="collapsed"]', 'labelGroupIndexOptionCollapsed');
setTextContent('#select-groupIndexOption > option[value="never"]', 'labelGroupIndexOptionNever');

setTextContent('#optionsHeadingAppearance', 'optionsHeadingAppearance');

setTextContent('label[for="select-popupSize"]', 'labelPopupSize');

setTextContent('#select-popupSize > option[value="standard"]', 'labelPopupSizeStandard');
setTextContent('#select-popupSize > option[value="large"]', 'labelPopupSizeLarge');

setTextContent('label[for="input-enableSorting"]', 'optionEnableSorting');
