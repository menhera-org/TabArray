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

import { ProxyPreset } from "./ProxyPreset";
import { ProxyType } from "./ProxyType";

const DEFAULT_FAILOVER_TIMEOUT = 10;

export interface ProxyInfoBase {
  type: 'direct' | 'http' | 'https' | 'socks' | 'socks4';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  proxyDNS?: boolean;
  failoverTimeout?: number;
  proxyAuthorizationHeader?: undefined;
}

export interface DirectProxyInfo extends ProxyInfoBase {
  type: 'direct';
  host?: undefined;
  port?: undefined;
  username?: undefined;
  password?: undefined;
  proxyDNS?: undefined;
  failoverTimeout?: undefined;
}

export interface HttpProxyInfo extends ProxyInfoBase {
  type: 'http' | 'https';
  host: string;
  port: number;
  username?: undefined;
  password?: undefined;
  proxyDNS?: undefined;
  failoverTimeout: number;
}

export interface SocksProxyInfo extends ProxyInfoBase {
  type: 'socks' | 'socks4';
  host: string;
  port: number;
  username?: string;
  password?: string;
  proxyDNS: boolean;
  failoverTimeout: number;
}

/**
 * Returned from browser.proxy.onRequest.addListener() handlers.
 */
export type ProxyInfo = DirectProxyInfo | HttpProxyInfo | SocksProxyInfo;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ProxyInfo {
  export const fromProxyPreset = (preset: ProxyPreset): ProxyInfo => {
    switch (preset.type) {
      case ProxyType.HTTP:
      case ProxyType.HTTPS: {
        const type = preset.type === ProxyType.HTTP ? 'http' : 'https';
        return {
          type,
          host: preset.host,
          port: preset.port,
          failoverTimeout: DEFAULT_FAILOVER_TIMEOUT,
        };
      }

      case ProxyType.SOCKS5:
      case ProxyType.SOCKS4: {
        const type = preset.type === ProxyType.SOCKS5 ? 'socks' : 'socks4';
        return {
          type,
          host: preset.host,
          port: preset.port,
          username: preset.username,
          password: preset.password,
          proxyDNS: preset.proxyDns ?? true,
          failoverTimeout: DEFAULT_FAILOVER_TIMEOUT,
        };
      }
    }
  };

  export const UNUSABLE_PROXY: ProxyInfo = Object.freeze({
    type: 'socks',
    host: '127.127.127.127',
    port: 1,
    proxyDNS: true,
    failoverTimeout: 1,
  });
}
