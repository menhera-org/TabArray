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
import { PackageDirectory } from "./PackageDirectory";
import { DirectoryListingParser } from "./DirectoryListingParser";

export class DirectoryListingService {
  private static readonly INSTANCE = new DirectoryListingService();

  public static getInstance(): DirectoryListingService {
    return DirectoryListingService.INSTANCE;
  }

  private constructor() {
    // empty
  }

  private readonly _parser = new DirectoryListingParser();

  public async getDirectory(pathUrl: string): Promise<PackageDirectory> {
    if (!pathUrl.startsWith('/') || !pathUrl.endsWith('/')) {
      throw new Error(`Invalid path: ${pathUrl}`);
    }
    const response = await fetch(pathUrl);
    const text = await response.text();
    const packageDirectory = this._parser.parse(text, pathUrl);
    return packageDirectory;
  }

  public async getPackageLocationUrl(): Promise<string> {
    const packageDirectory = await this.getDirectory('/');
    return packageDirectory.packageLocationUrl;
  }

  private async getFilePathsInternal(pathUrl: string): Promise<string[]> {
    const paths: string[] = [];
    const dir = await this.getDirectory(pathUrl);
    for (const entry of dir.entries) {
      if (entry.type == 'file') {
        paths.push(this.decodePath(entry.fullPath));
      } else if (entry.type == 'directory') {
        paths.push(... await this.getFilePathsInternal(this.decodePath(entry.fullPath)));
      }
    }
    return paths;
  }

  /**
   * Returns a sorted list of all files in the package.
   */
  public async getFilePaths(): Promise<string[]> {
    return this.sortPaths(await this.getFilePathsInternal('/'));
  }

  public sortPaths(paths: readonly string[]): string[] {
    paths.forEach((path) => {
      if (!path.startsWith('/')) {
        throw new Error(`Invalid path: ${path}`);
      }
    });
    return [... paths].sort((a, b) => {
      const aParts = a.split('/').slice(1).filter(part => part != '');
      const bParts = b.split('/').slice(1).filter(part => part != '');
      const minLength = Math.min(aParts.length, bParts.length);
      for (let i = 0; i < minLength; i++) {
        const aPart = aParts[i] as string;
        const bPart = bParts[i] as string;
        if (aPart < bPart) {
          return -1;
        } else if (aPart > bPart) {
          return 1;
        }
      }
      return aParts.length - bParts.length;
    });
  }

  public encodePath(path: string): string {
    return path.split('/').map(part => encodeURIComponent(part)).join('/');
  }

  public decodePath(path: string): string {
    return path.split('/').map(part => decodeURIComponent(part)).join('/');
  }
}

ServiceRegistry.getInstance().registerService('DirectoryListingService', DirectoryListingService.getInstance());
