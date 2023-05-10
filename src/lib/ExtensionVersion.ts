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

import { Uint32 } from "weeg-types";

/**
 * This is more strict than Mozilla's version comparison algorithm.
 * It does not allow non-numeric parts in the version string.
 */
export class ExtensionVersion {
  public static readonly VERSION_REGEXP = /^(0|[1-9][0-9]{0,8})([.](0|[1-9][0-9]{0,8})){0,3}$/;

  public static fromString(version: string): ExtensionVersion {
    version = String(version);
    if (!ExtensionVersion.VERSION_REGEXP.test(version)) {
      throw new TypeError('Invalid version for AMO: ' + version);
    }
    const versionParts = version.split('.').map((part) => parseInt(part, 10));
    versionParts.forEach((part) => {
      if (isNaN(part)) {
        throw new Error(`Invalid version string: ${version}`);
      }
    });
    return new ExtensionVersion(versionParts);
  }

  public static fromNumbers(versionParts: number[]): ExtensionVersion {
    return new ExtensionVersion(versionParts);
  }

  public readonly versionParts: readonly number[];

  private constructor(versionParts: number[]) {
    if (versionParts.length === 0 || versionParts.length > 4) {
      throw new TypeError('Invalid number of version parts: ' + versionParts.length);
    }
    versionParts.forEach((part) => {
      if (!Uint32.isUint32(part)) {
        throw new TypeError('Invalid number in version: ' + part);
      }
      if (part > 999999999) {
        throw new TypeError('Version number too large: ' + part);
      }
    });
    this.versionParts = versionParts;
  }

  public compare(other: ExtensionVersion): number {
    const length = Math.max(this.versionParts.length, other.versionParts.length);
    for (let i = 0; i < length; i++) {
      const thisPart = this.versionParts[i] || 0;
      const otherPart = other.versionParts[i] || 0;
      if (thisPart < otherPart) {
        return -1;
      }
      if (thisPart > otherPart) {
        return 1;
      }
    }
    return 0;
  }

  public isEqualTo(other: ExtensionVersion): boolean {
    return this.compare(other) === 0;
  }

  public isGreaterThan(other: ExtensionVersion): boolean {
    return this.compare(other) > 0;
  }

  public isLessThan(other: ExtensionVersion): boolean {
    return this.compare(other) < 0;
  }

  public toString() {
    return this.versionParts.join('.');
  }
}
