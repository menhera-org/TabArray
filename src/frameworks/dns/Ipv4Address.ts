// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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

export const Ipv4Address: InetAddressConstructor = class Ipv4Address implements InetAddress {
  public readonly version = InetVersion.V4;

  private readonly byteArray: Uint8Array;

  public constructor(str: string) {
    const parts = str.split(".");
    if (parts.length != 4) {
      throw new Error("Invalid IPv4 address");
    }
    const numbers = parts.map((part) => {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error("Invalid IPv4 address");
      }
      return num;
    });
    this.byteArray = new Uint8Array(numbers);
  }

  toByteArray(): Uint8Array {
    return this.byteArray;
  }

  toString(): string {
    return [... this.byteArray].join(".");
  }
}
