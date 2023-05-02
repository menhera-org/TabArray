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

import { ServiceRegistry } from "../ServiceRegistry";
import { DirectoryListingService } from "./DirectoryListingService";

const directoryListingService = DirectoryListingService.getInstance();

export class PackageIntegrityService {
  private static readonly INSTANCE = new PackageIntegrityService();

  public static getInstance(): PackageIntegrityService {
    return PackageIntegrityService.INSTANCE;
  }

  private async sha256(message: Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', message);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  public async calculateFileHash(path: string): Promise<string> {
    const encodedPath = directoryListingService.encodePath(path);
    const response = await fetch(encodedPath);
    const byteArray = new Uint8Array(await response.arrayBuffer());
    return this.sha256(byteArray);
  }

  public async getIntegrityListing(): Promise<Record<string, string>> {
    const filePaths = await directoryListingService.getFilePaths();
    const filteredFilePaths = filePaths.filter((path) => !path.startsWith('/META-INF/') && path != '/.integrity.json');
    const listing: Record<string, string> = {};
    for (const filePath of filteredFilePaths) {
      const hash = await this.calculateFileHash(filePath);
      listing[filePath] = hash;
    }
    return listing;
  }

  public async getIntegrityHash(): Promise<string> {
    const listing = await this.getIntegrityListing();
    const json = JSON.stringify(listing);
    const byteArray = new TextEncoder().encode(json);
    return this.sha256(byteArray);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getIntegrityRecord(): Promise<any> {
    const response = await fetch('/.integrity.json');
    const data = await response.json();
    if (data.version != 1) {
      throw new Error('Unsupported integrity version');
    }
    return data;
  }

  public async getRecordedIntegrityHash(): Promise<string> {
    const data = await this.getIntegrityRecord();
    return data.hash;
  }

  public async getRecordedIntegrityListing(): Promise<Record<string, string>> {
    const data = await this.getIntegrityRecord();
    return data.files;
  }
}

ServiceRegistry.getInstance().registerService('PackageIntegrityService', PackageIntegrityService.getInstance());
