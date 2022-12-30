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


document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');

const setTextContent = (query: string, message: string) => {
  const element = document.querySelector(query);
  if (!element) {
    throw new Error(`Missing element: ${query}`);
  }
  element.textContent = browser.i18n.getMessage(message);
};

setTextContent('#link-containers', 'optionsHeadingContainerSortOrder');
setTextContent('#link-container-overrides', 'optionsHeadingContainerOverrides');

setTextContent('#optionsHeadingContainerOverrides', 'optionsHeadingContainerOverrides');

setTextContent('#optionalFeaturesDescription', 'optionalFeaturesDescription');

setTextContent('label[for="input-featureLanguageOverrides"]', 'featureLanguageOverrides');

setTextContent('label[for="input-featureUaOverrides"]', 'featureUaOverrides');

setTextContent('#optionsHeadingExperimental', 'optionsHeadingExperimental');
setTextContent('#optionsHeadingFirefox', 'optionsHeadingFirefox');
setTextContent('#optionsDescriptionExperimental', 'optionsDescriptionExperimental');
setTextContent('#optionsDescriptionFirefox', 'optionsDescriptionFirefox');
setTextContent('#fpiDescription', 'fpiDescription');
setTextContent('#optionsHeadingContainerSortOrder', 'optionsHeadingContainerSortOrder');
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
