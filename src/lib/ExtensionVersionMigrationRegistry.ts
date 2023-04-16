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

import { ExtensionVersion } from "./ExtensionVersion";

export type MigrationOperation = (version: ExtensionVersion) => Promise<void> | void;

export class ExtensionVersionMigrationRegistry {
  private readonly _migrations: Map<string, MigrationOperation> = new Map();

  public defineMigration(version: string, operation: MigrationOperation): void {
    this._migrations.set(version, operation);
  }

  public getMigrationVersions(): string[] {
    return Array.from(this._migrations.keys()).sort((a, b) => {
      return ExtensionVersion.fromString(a).compare(ExtensionVersion.fromString(b));
    });
  }

  private callMigration(version: string): Promise<void> {
    const operation = this._migrations.get(version);
    if (!operation) {
      return Promise.resolve();
    }
    return Promise.resolve(operation(ExtensionVersion.fromString(version)));
  }

  public async migrate(oldVersion: string, newVersion: string): Promise<void> {
    const oldVersionObj = ExtensionVersion.fromString(oldVersion);
    const newVersionObj = ExtensionVersion.fromString(newVersion);
    if (oldVersionObj.isEqualTo(newVersionObj)) {
      return;
    }
    if (oldVersionObj.isGreaterThan(newVersionObj)) {
      throw new Error(`Cannot migrate from ${oldVersion} to ${newVersion}`);
    }
    const versions = this.getMigrationVersions();
    for (const version of versions) {
      const versionObj = ExtensionVersion.fromString(version);
      if (versionObj.isGreaterThan(oldVersionObj) && !versionObj.isGreaterThan(newVersionObj)) {
        console.info('Running migration for version', version);
        await this.callMigration(version);
      }
    }
  }
}
