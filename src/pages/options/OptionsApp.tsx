/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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
import { type ReactNode, useEffect, useState } from 'react';

import { FpiService } from '../../lib/config/FpiService';
import { config, privacyConfig } from '../../config/config';

import { HelpBanner } from '../../frontend/frame/HelpBanner';

import { CheckboxSetting, SelectSetting } from './settings';
import { TabGroupOverrides, TabGroupProxy, TabGroupSorter } from './listings';
import { ProxyManager } from './ProxyManager';
import { NativeTabGroupService } from '../../lib/tabGroups/NativeTabGroupService';

// The tab group options show only where Firefox offers tab groups to extensions.
const nativeTabGroupsSupported = NativeTabGroupService.getInstance().isSupported();

/** The panes, by their URL fragment, with the i18n message names of their tabs. */
export const PANES: [string, string][] = [
  ['general', 'optionsTabGeneral'],
  ['containers', 'optionsTabSortContainers'],
  ['container-overrides', 'optionsTabContainerOverrides'],
  ['proxies', 'optionsTabProxies'],
  ['firefox-settings', 'optionsTabFirefoxSettings'],
  ['help', 'menuItemHelp'],
];

/** The pane named by the URL fragment, or the first one. */
export const paneFromHash = (hash: string) => hash.slice(1) || 'general';

const useHash = () => {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const update = () => setHash(location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return hash;
};

const message = (name: string) => browser.i18n.getMessage(name);

const Pane = ({ name, active, children }: { name: string; active: string; children: ReactNode }) => (
  <div data-pane-name={name} className={name == active ? 'active' : ''}>
    {children}
  </div>
);

const setFirstPartyIsolate = (value: boolean) => FpiService.getInstance().setFirstPartyIsolate(value);

/**
 * The Options page. To add a setting, add a CheckboxSetting or SelectSetting for its config option
 * to the right pane, and its label to the locales.
 */
export const OptionsApp = () => {
  const active = paneFromHash(useHash());
  return (
    <>
      <nav id="pane-tabs">
        {PANES.map(([name, label]) => (
          <a
            key={name}
            href={`#${name}`}
            className={`pane-tab ${name == active ? 'selected' : ''}`}
            data-pane-name={name}
          >
            {message(label)}
          </a>
        ))}
      </nav>
      <div id="optionsPanes">
        <Pane name="general" active={active}>
          <h2>{message('optionsHeadingGeneral')}</h2>
          <CheckboxSetting
            id="input-enableSorting"
            label="optionEnableSorting"
            option={config['tab.sorting.enabled']}
          />
          <CheckboxSetting
            id="input-sortContainersByName"
            label="optionSortContainersByName"
            option={config['tab.groups.sortByName']}
          />
          {nativeTabGroupsSupported && (
            <CheckboxSetting
              id="input-nativeTabGroupSync"
              label="optionNativeTabGroupSync"
              option={config['tab.groups.nativeSync']}
            />
          )}
          {nativeTabGroupsSupported && (
            <CheckboxSetting
              id="input-listCollapsedTabs"
              label="optionListCollapsedTabs"
              option={config['sidebar.listCollapsedTabs']}
            />
          )}
          <SelectSetting
            id="select-autoDiscardMinAge"
            label="labelAutoDiscardMinAge"
            option={config['tab.autoDiscard.minAge']}
            choices={[
              [-1, 'labelAutoDiscardDisabled'],
              [900, 'labelAutoDiscard900'],
              [1800, 'labelAutoDiscard1800'],
              [3600, 'labelAutoDiscard3600'],
              [10800, 'labelAutoDiscard10800'],
              [21600, 'labelAutoDiscard21600'],
              [43200, 'labelAutoDiscard43200'],
              [86400, 'labelAutoDiscard86400'],
            ]}
          />
          <CheckboxSetting
            id="input-syncContainers"
            label="optionSyncContainers"
            option={config['feature.syncContainers']}
          />
          <h2>{message('optionsHeadingAppearance')}</h2>
          <SelectSetting
            id="select-popupSize"
            label="labelPopupSize"
            option={config['appearance.popupSize']}
            choices={[
              ['standard', 'labelPopupSizeStandard'],
              ['large', 'labelPopupSizeLarge'],
            ]}
          />
          <CheckboxSetting
            id="input-hideTabCount"
            label="optionHideTabCount"
            option={config['appearance.hideTabCount']}
          />
          <h2>{message('optionsHeadingExperimental')}</h2>
          <p>{message('optionsDescriptionExperimental')}</p>
          <CheckboxSetting
            id="input-newtabKeepContainer"
            label="labelNewTabKeepContainer"
            option={config['newtab.keepContainer']}
          />
          <CheckboxSetting
            id="input-autoCenterInSidebar"
            label="optionAutoCenterInSidebar"
            option={config['tab.autoCenterInSidebar']}
          />
          <SelectSetting
            id="select-externalTabContainerOption"
            label="labelExternalTabSelectContainerOption"
            option={config['tab.external.containerOption']}
            choices={[
              ['choose', 'labelExternalTabOptionChooseContainer'],
              ['sticky', 'labelExternalTabOptionStickyContainer'],
              ['disabled', 'labelExternalTabOptionDisabled'],
            ]}
          />
          <SelectSetting
            id="select-groupIndexOption"
            label="labelGroupIndexOption"
            option={config['tab.groups.indexOption']}
            choices={[
              ['always', 'labelGroupIndexOptionAlways'],
              ['collapsed', 'labelGroupIndexOptionCollapsed'],
              ['never', 'labelGroupIndexOptionNever'],
            ]}
          />
          <CheckboxSetting
            id="input-autoHideContainers"
            label="optionAutoHideContainers"
            option={config['tab.autoHide.enabled']}
          />
        </Pane>
        <Pane name="containers" active={active}>
          <p>{message('optionsDescriptionContainerSortOrder')}</p>
          <TabGroupSorter />
        </Pane>
        <Pane name="container-overrides" active={active}>
          <p>{message('optionalFeaturesDescription')}</p>
          <CheckboxSetting
            id="input-featureLanguageOverrides"
            label="featureLanguageOverrides"
            option={config['feature.languageOverrides']}
          />
          <CheckboxSetting
            id="input-featureUaOverrides"
            label="featureUaOverrides"
            option={config['feature.uaOverrides']}
          />
          <TabGroupOverrides />
        </Pane>
        <Pane name="proxies" active={active}>
          <p>{message('optionalFeaturesDescription')}</p>
          <CheckboxSetting
            id="input-featurePerContainerProxy"
            label="featurePerContainerProxy"
            option={config['feature.containerProxy']}
          />
          <div>
            <TabGroupProxy />
          </div>
          <h2>{message('optionsHeadingAvailableProxies')}</h2>
          <ProxyManager />
        </Pane>
        <Pane name="firefox-settings" active={active}>
          <h2>{message('optionsHeadingFirefox')}</h2>
          <p>{message('optionsDescriptionFirefox')}</p>
          <p>{message('fpiDescriptionOptIn')}</p>
          <CheckboxSetting
            id="input-firstPartyIsolate"
            label="labelFirstPartyIsolate"
            option={privacyConfig.firstPartyIsolate}
            save={setFirstPartyIsolate}
          />
          <CheckboxSetting
            id="input-resistFingerprinting"
            label="labelResistFingerprinting"
            option={privacyConfig.resistFingerprinting}
          />
          <p>{message('resistFingerprintingWarning')}</p>
        </Pane>
        <Pane name="help" active={active}>
          <HelpBanner />
        </Pane>
      </div>
    </>
  );
};
