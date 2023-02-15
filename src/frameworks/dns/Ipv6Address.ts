// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import { InetAddress } from "./InetAddress";
import { InetAddressConstructor } from "./InetAddressConstructor";
import { InetVersion } from "./InetVersion";

/**
 * This class represents an IPv6 address.
 * This does not support interface identifiers.
 */
export const Ipv6Address: InetAddressConstructor = class Ipv6Address implements InetAddress {
  public readonly version = InetVersion.V6;
  private readonly byteArray = new Uint8Array(16);

  public constructor(address: string) {
    const view = new Uint16Array(this.byteArray.buffer);
    const parseNumber = (part: string) => {
      const num = parseInt(part, 16);
      if (isNaN(num) || num < 0 || num > 0xffff) {
        throw new Error("Invalid IPv6 address");
      }
      return num;
    };
    let parts: number[];
    if (address.includes('::')) {
      const [left, right] = address.split('::');
      if (!left && !right) {
        // "::"
        return;
      }
      const leftParts = (left ? left.split(':') : []).map(parseNumber);
      const rightParts = (right ? right.split(':') : []).map(parseNumber);
      const missingParts = 8 - leftParts.length - rightParts.length;
      parts = [...leftParts, ...new Array(missingParts).fill(0), ...rightParts];
    } else {
      parts = address.split(':').map(parseNumber);
    }
    if (parts.length != 8) {
      throw new Error("Invalid IPv6 address");
    }
    view.set(parts);
  }

  public toByteArray(): Uint8Array {
    return this.byteArray;
  }

  public toString(): string {
    const view = new Uint16Array(this.byteArray.buffer);
    const parts = [...view].map((num) => num.toString(16));
    const longestZeroSequence = parts.reduce((longest, part, index) => {
      if (part === '0') {
        const start = index;
        while (index < parts.length && parts[index] === '0') {
          index++;
        }
        const length = index - start;
        if (length > longest.length) {
          return { start, length };
        }
      }
      return longest;
    }, { start: 0, length: 0 });
    if (longestZeroSequence.length > 1) {
      parts.splice(longestZeroSequence.start, longestZeroSequence.length, '');
    }
    return parts.join(':');
  }
}
