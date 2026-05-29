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

/* eslint-disable @typescript-eslint/no-namespace */

/**
 * enum of supported proxy types.
 */
export enum ProxyType {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS4 = 'socks4',
  SOCKS5 = 'socks5',
}

export namespace ProxyType {
  export const fromString = (value: string): ProxyType => {
    switch (value) {
      case ProxyType.HTTP: {
        return ProxyType.HTTP;
      }

      case ProxyType.HTTPS: {
        return ProxyType.HTTPS;
      }

      case ProxyType.SOCKS4: {
        return ProxyType.SOCKS4;
      }

      case ProxyType.SOCKS5: {
        return ProxyType.SOCKS5;
      }

      default: {
        throw new TypeError(`Unknown proxy type: ${value}`);
      }
    }
  };

  export const isHttpType = (value: ProxyType): boolean => {
    return value === ProxyType.HTTP || value === ProxyType.HTTPS;
  };

  export const isSocksType = (value: ProxyType): boolean => {
    return value === ProxyType.SOCKS4 || value === ProxyType.SOCKS5;
  };
}
