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
import { useState } from 'react';

import { ProxyPreset, ProxyPresetParams } from '../../lib/proxies/ProxyPreset';
import { ProxyType } from '../../lib/proxies/ProxyType';
import { ProxySettings } from '../../lib/proxies/ProxySettings';
import { CompatConsole } from '../../lib/console/CompatConsole';

import { useLoaded } from '../../frontend/useLoaded';

import styles from './ProxyManager.module.css';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const logError = (e: unknown) => console.error(e);
const presetStore = ProxySettings.getInstance().presetStore;

export type ProxyForm = {
  /** The preset being edited, or null for a new one. */
  id: string | null;
  name: string;
  protocol: string;
  hostname: string;
  port: string;
  username: string;
  password: string;
  doNotProxyLocal: boolean;
  proxyDns: boolean;
};

export const EMPTY_FORM: ProxyForm = {
  id: null,
  name: '',
  protocol: ProxyType.HTTP,
  hostname: '',
  port: '1080',
  username: '',
  password: '',
  doNotProxyLocal: false,
  proxyDns: true,
};

export const formFromPreset = (preset: ProxyPreset): ProxyForm => ({
  id: preset.id,
  name: preset.title,
  protocol: preset.type,
  hostname: preset.host,
  port: preset.port.toString(),
  username: preset.username ?? '',
  password: preset.password ?? '',
  doNotProxyLocal: preset.doNotProxyLocal,
  proxyDns: preset.proxyDns ?? true,
});

/** What the form saves, or null while it has no hostname. */
export const presetParams = (form: ProxyForm): ProxyPresetParams | null => {
  const host = form.hostname.trim();
  if (host == '') return null;
  return {
    title: form.name.trim(),
    type: form.protocol,
    host,
    port: parseInt(form.port),
    username: form.username,
    password: form.password,
    doNotProxyLocal: form.doNotProxyLocal,
    proxyDns: form.proxyDns,
  };
};

const PROTOCOLS = [ProxyType.HTTP, ProxyType.HTTPS, ProxyType.SOCKS4, ProxyType.SOCKS5];

/** The saved proxies on one side, and a form to add, edit or delete one on the other. */
export const ProxyManager = () => {
  const presets = useLoaded(() => presetStore.getProxyPresets(), presetStore.onChanged);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = <K extends keyof ProxyForm>(key: K, value: ProxyForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const message = browser.i18n.getMessage;

  const save = () => {
    const params = presetParams(form);
    if (!params) return;
    if (form.id) {
      presetStore.updateProxyPreset(form.id, params).catch(logError);
    } else {
      presetStore
        .addProxyPreset(params)
        .then((preset) => set('id', preset.id))
        .catch(logError);
    }
  };
  const remove = () => {
    if (form.id) presetStore.deleteProxyPreset(form.id).catch(logError);
    setForm(EMPTY_FORM);
  };
  const isHttp = form.protocol == ProxyType.HTTP || form.protocol == ProxyType.HTTPS;

  return (
    <div className={styles.manager}>
      <div className={styles.list}>
        <button
          className={`ctg-icon-button ${styles.newProxy}`}
          title={message('buttonAddNewProxy')}
          onClick={() => setForm(EMPTY_FORM)}
        />
        <div className={styles.presets}>
          {presets?.map((preset) => (
            <button
              key={preset.id}
              id={`button-proxy-${preset.id}`}
              className={form.id == preset.id ? styles.selected : ''}
              onClick={() => setForm(formFromPreset(preset))}
            >
              {ProxyPreset.getName(preset)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.editorDeck}>
        <div className={styles.editor}>
          <p>
            <label htmlFor="proxy-name">{message('proxyName')}</label>
            <input id="proxy-name" value={form.name} onChange={(ev) => set('name', ev.currentTarget.value)} />
          </p>
          <p>
            <label htmlFor="proxy-protocol">{message('proxyProtocol')}</label>
            <select
              id="proxy-protocol"
              value={form.protocol}
              onChange={(ev) => set('protocol', ev.currentTarget.value)}
            >
              {PROTOCOLS.map((protocol) => (
                <option key={protocol} value={protocol}>
                  {protocol.toUpperCase()}
                </option>
              ))}
            </select>
          </p>
          <p>
            <label htmlFor="proxy-hostname">{message('proxyHostname')}</label>
            <input
              id="proxy-hostname"
              value={form.hostname}
              onChange={(ev) => set('hostname', ev.currentTarget.value)}
            />
            <label htmlFor="proxy-port">{message('proxyPort')}</label>
            <input
              id="proxy-port"
              className={styles.port}
              type="number"
              min="1"
              max="65535"
              step="1"
              value={form.port}
              onChange={(ev) => set('port', ev.currentTarget.value)}
            />
          </p>
          <p>
            <label htmlFor="proxy-username">{message('proxyUsername')}</label>
            <input
              id="proxy-username"
              value={form.username}
              onChange={(ev) => set('username', ev.currentTarget.value)}
            />
          </p>
          <p>
            <label htmlFor="proxy-password">{message('proxyPassword')}</label>
            <input
              id="proxy-password"
              type="password"
              value={form.password}
              onChange={(ev) => set('password', ev.currentTarget.value)}
            />
          </p>
          <p>
            <input
              id="proxy-do-not-proxy-local"
              type="checkbox"
              checked={form.doNotProxyLocal}
              onChange={(ev) => set('doNotProxyLocal', ev.currentTarget.checked)}
            />
            <label htmlFor="proxy-do-not-proxy-local">{message('proxyExemptLocalAddresses')}</label>
          </p>
          <p hidden={isHttp}>
            <input
              id="proxy-dns"
              type="checkbox"
              checked={form.proxyDns}
              onChange={(ev) => set('proxyDns', ev.currentTarget.checked)}
            />
            <label htmlFor="proxy-dns">{message('proxyDnsRequests')}</label>
          </p>
          <p className={styles.actions}>
            <button className="ctg-button destructive" onClick={remove}>
              {message('buttonDeleteProxy')}
            </button>
            <button className="ctg-button primary" onClick={save}>
              {message('buttonOk')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
