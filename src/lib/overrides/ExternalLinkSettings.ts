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

import { AbstractPerContainerSettings } from './AbstractPerContainerSettings';

/** "https://Example.com/x, *.foo.org bar.net" → "example.com, foo.org, bar.net". */
export const normalizeHosts = (input: string): string => {
  const hosts = input
    .split(/[\s,]+/)
    .map((part) =>
      part
        .toLowerCase()
        .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
        .replace(/[/?#].*$/, '')
        .replace(/:\d+$/, '')
        .replace(/^(?:\*?\.)+/, '')
        .replace(/\.$/, '')
    )
    .filter((host) => host.length > 0);
  return [...new Set(hosts)].join(', ');
};

/**
 * The container whose sites include the URL's host, or one of its parent domains; the most specific
 * site wins (#481).
 */
export const findContainerForUrl = (hostsByContainer: Record<string, string>, url: string): string | undefined => {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return undefined;
  }
  let found: { cookieStoreId: string; host: string } | undefined;
  for (const [cookieStoreId, hosts] of Object.entries(hostsByContainer)) {
    for (const host of hosts.split(', ')) {
      if (hostname != host && !hostname.endsWith(`.${host}`)) continue;
      if (!found || host.length > found.host.length) found = { cookieStoreId, host };
    }
  }
  return found?.cookieStoreId;
};

/** Per-container sites that links from other apps open in. */
export class ExternalLinkSettings extends AbstractPerContainerSettings<string> {
  private static readonly INSTANCE = new ExternalLinkSettings();

  public static getInstance(): ExternalLinkSettings {
    return ExternalLinkSettings.INSTANCE;
  }

  private constructor() {
    super();
  }

  protected override getStorageKey(): string {
    return 'externalLinkHostsByContainer';
  }

  public async setValueForTabGroup(cookieStoreId: string, input: string): Promise<void> {
    const hosts = normalizeHosts(input);
    const value = await this.getValue();
    if (hosts == (value[cookieStoreId] ?? '')) return;
    if (hosts == '') {
      delete value[cookieStoreId];
    } else {
      value[cookieStoreId] = hosts;
    }
    await this.setValue(value);
  }

  public async getContainerForUrl(url: string): Promise<string | undefined> {
    return findContainerForUrl(await this.getValue(), url);
  }
}
