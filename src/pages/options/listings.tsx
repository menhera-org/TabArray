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
import { useEffect, useState } from 'react';

import { TabGroupService } from '../../lib/tabGroups/TabGroupService';
import { LanguageSettings } from '../../lib/overrides/LanguageSettings';
import { UserAgentPreset, UserAgentSettings } from '../../lib/overrides/UserAgentSettings';
import { ProxySettings } from '../../lib/proxies/ProxySettings';
import { ProxyPreset } from '../../lib/proxies/ProxyPreset';
import { ExternalLinkSettings } from '../../lib/overrides/ExternalLinkSettings';
import { TabGroupAttributes } from '../../lib/tabGroups/TabGroupAttributes';
import { CompatConsole } from '../../lib/console/CompatConsole';
import { config } from '../../config/config';

import { useLoaded } from '../../frontend/useLoaded';

import { TabGroupListing } from './TabGroupListing';
import { useOption } from './settings';
import { CommitInput } from './CommitInput';

import styles from './listings.module.css';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const logError = (e: unknown) => console.error(e);

const tabGroupService = TabGroupService.getInstance();
const languageSettings = LanguageSettings.getInstance();
const userAgentSettings = UserAgentSettings.getInstance();
const proxySettings = ProxySettings.getInstance();
const externalLinkSettings = ExternalLinkSettings.getInstance();

/** Sort Containers pane: reorder containers and groups, and choose which clear their cookies automatically. */
export const TabGroupSorter = () => {
  const autocleanIds = useLoaded(
    () => tabGroupService.optionDirectory.getAutocleanEnabledTabGroupIds(),
    tabGroupService.directory.onChanged
  );
  const [changed, setChanged] = useState(new Map<string, boolean>());
  return (
    <TabGroupListing
      sortable
      columns={[
        browser.i18n.getMessage('enableCookiesAutoclean'),
        browser.i18n.getMessage('optionsLabelExternalSites'),
      ]}
      gridTemplateColumns="1fr min-content 12em"
      cells={(tabGroupId) => (
        <>
          <div className={styles.autoclean}>
            <input
              type="checkbox"
              checked={changed.get(tabGroupId) ?? autocleanIds?.includes(tabGroupId) ?? false}
              onChange={(ev) => {
                const enabled = ev.currentTarget.checked;
                setChanged((map) => new Map(map).set(tabGroupId, enabled));
                tabGroupService.optionDirectory.setAutocleanForTabGroupId(tabGroupId, enabled).catch(logError);
              }}
            />
          </div>
          {new TabGroupAttributes(tabGroupId).tabGroupType == 'cookieStore' ? (
            <ExternalSitesCell tabGroupId={tabGroupId} />
          ) : (
            <div />
          )}
        </>
      )}
    />
  );
};

/** Sites that links from other apps open in this container (#481). */
const ExternalSitesCell = ({ tabGroupId }: { tabGroupId: string }) => {
  const hosts = useLoaded(() => externalLinkSettings.getValueForTabGroup(tabGroupId), externalLinkSettings.onChanged);
  return (
    <CommitInput
      className={styles.text}
      value={hosts ?? ''}
      placeholder="example.com"
      onCommit={(value) => {
        externalLinkSettings.setValueForTabGroup(tabGroupId, value).catch(logError);
      }}
    />
  );
};

const LanguagesCell = ({ tabGroupId, enabled }: { tabGroupId: string; enabled: boolean }) => {
  const languages = useLoaded(() => languageSettings.getValueForTabGroup(tabGroupId), languageSettings.onChanged);
  return (
    <CommitInput
      className={styles.text}
      value={languages ?? ''}
      placeholder={navigator.languages.join(',')}
      disabled={!enabled}
      onCommit={(value) => {
        languageSettings.setValueForTabGroup(tabGroupId, value).catch(logError);
      }}
    />
  );
};

const USER_AGENT_PRESETS: [UserAgentPreset, string][] = [
  ['default', 'userAgentDefault'],
  ['chrome', 'userAgentChrome'],
  ['googlebot', 'userAgentGooglebot'],
  ['custom', 'userAgentCustom'],
];

const UserAgentCell = ({ tabGroupId, enabled }: { tabGroupId: string; enabled: boolean }) => {
  const [preset, setPreset] = useState<UserAgentPreset>('default');
  const [userAgent, setUserAgent] = useState('');
  // Shows a preset: a custom one can be edited; the others show the user agent they send.
  const show = (newPreset: UserAgentPreset, customUserAgent?: string) => {
    setPreset(newPreset);
    if (newPreset == 'custom') {
      setUserAgent(customUserAgent || navigator.userAgent);
    } else {
      userAgentSettings
        .getUserAgent(tabGroupId)
        .then((ua) => setUserAgent(ua || navigator.userAgent))
        .catch(logError);
    }
  };
  useEffect(() => {
    const load = () => {
      userAgentSettings
        .getUserAgentParams(tabGroupId)
        .then(({ preset, userAgent }) => show(preset, userAgent))
        .catch(logError);
    };
    load();
    userAgentSettings.onChanged.addListener(load);
    return () => userAgentSettings.onChanged.removeListener(load);
  }, [tabGroupId]);
  const change = (newPreset: UserAgentPreset, value: string) => {
    const trimmed = value.trim();
    show(newPreset, trimmed);
    userAgentSettings.setUserAgent(tabGroupId, newPreset, trimmed || undefined).catch(logError);
  };
  return (
    <div className={styles.userAgent}>
      <select
        className={styles.userAgentSelect}
        value={preset}
        disabled={!enabled}
        onChange={(ev) => change(ev.currentTarget.value as UserAgentPreset, userAgent)}
      >
        {USER_AGENT_PRESETS.map(([value, message]) => (
          <option key={value} value={value}>
            {browser.i18n.getMessage(message)}
          </option>
        ))}
      </select>
      <CommitInput
        className={styles.text}
        value={userAgent}
        placeholder={navigator.userAgent}
        readOnly={preset != 'custom'}
        disabled={!enabled}
        onCommit={(value) => change(preset, value)}
      />
    </div>
  );
};

/** Languages and User Agents pane: per-container overrides, editable while each feature is on. */
export const TabGroupOverrides = () => {
  const [languagesEnabled] = useOption(config['feature.languageOverrides']);
  const [userAgentEnabled] = useOption(config['feature.uaOverrides']);
  return (
    <TabGroupListing
      columns={[browser.i18n.getMessage('optionsLabelLanguages'), browser.i18n.getMessage('optionsLabelUserAgent')]}
      gridTemplateColumns="1fr 8em auto"
      cells={(tabGroupId) => (
        <>
          <LanguagesCell tabGroupId={tabGroupId} enabled={languagesEnabled ?? true} />
          <UserAgentCell tabGroupId={tabGroupId} enabled={userAgentEnabled ?? true} />
        </>
      )}
    />
  );
};

const ProxyCell = ({
  tabGroupId,
  presets,
  enabled,
}: {
  tabGroupId: string;
  presets: ProxyPreset[];
  enabled: boolean;
}) => {
  const proxyId = useLoaded(() => proxySettings.getValueForTabGroup(tabGroupId), proxySettings.onChanged);
  // The choice shows at once; the saved value takes over when it next loads.
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => setChosen(null), [proxyId]);
  return (
    <select
      className={styles.proxies}
      value={chosen ?? proxyId ?? ''}
      disabled={!enabled}
      onChange={(ev) => {
        const value = ev.currentTarget.value;
        setChosen(value);
        proxySettings.setValueForTabGroup(tabGroupId, value).catch(logError);
      }}
    >
      <option value="">{browser.i18n.getMessage('noProxy')}</option>
      {presets.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {ProxyPreset.getName(preset)}
        </option>
      ))}
    </select>
  );
};

/** Proxies pane: the proxy each container uses, chosen while per-container proxies are on. */
export const TabGroupProxy = () => {
  const presets = useLoaded(() => proxySettings.presetStore.getProxyPresets(), proxySettings.presetStore.onChanged);
  const [enabled] = useOption(config['feature.containerProxy']);
  return (
    <TabGroupListing
      columns={[browser.i18n.getMessage('optionsTabProxies')]}
      gridTemplateColumns="1fr min-content"
      reloadOn={proxySettings.presetStore.onChanged}
      cells={(tabGroupId) => <ProxyCell tabGroupId={tabGroupId} presets={presets ?? []} enabled={enabled ?? true} />}
    />
  );
};
