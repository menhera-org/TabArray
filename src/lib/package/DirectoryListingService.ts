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
import { PackageDirectory, PackageDirectoryEntry, PackageFileType } from "./PackageDirectory";

export class DirectoryListingService {
  private static readonly INSTANCE = new DirectoryListingService();

  public static getInstance(): DirectoryListingService {
    return DirectoryListingService.INSTANCE;
  }

  private constructor() {
    // empty
  }

  private parseDirectoryListing(listing: string): PackageDirectory {
    const JAR_SCHEME = 'jar:';
    const lines = listing.split('\n').map(line => line.trim()).filter(line => line != '');
    const packageDirectory: PackageDirectory = {
      packageLocationUrl: "",
      directoryPath: "",
      entries: []
    };
    let jarMetadataFound = false;
    for (const line of lines) {
      const parts = line.split(' ');
      const code = parts.shift() as string;
      if (code == '300:') {
        if (jarMetadataFound) {
          throw new Error(`Duplicate jar metadata found in directory listing: ${line}`);
        }
        jarMetadataFound = true;
        const jarUrl = parts.join(' ');
        if (!jarUrl.startsWith(JAR_SCHEME)) {
          throw new Error(`Invalid jar URL: ${jarUrl}`);
        }
        const [fileUrl, path] = jarUrl.slice(JAR_SCHEME.length).split('!') as [string, string];
        if (!path) {
          throw new Error(`Invalid jar URL: ${jarUrl}`);
        }
        packageDirectory.packageLocationUrl = fileUrl;
        packageDirectory.directoryPath = path;
      } else if (code == '201:') {
        const [filename, contentLength, , fileType] = parts as [string, string, string, string];
        if (!fileType) {
          throw new Error(`Invalid file type: ${line}`);
        }
        let type: PackageFileType = 'unknown';
        if (fileType == 'DIRECTORY') {
          type = 'directory';
        } else if (fileType == 'FILE') {
          type = 'file';
          if (filename.includes('/')) {
            throw new Error(`Invalid file name: ${line}`);
          }
        }
        const fileSize = parseInt(contentLength, 10);
        if (isNaN(fileSize)) {
          throw new Error(`Invalid file size: ${line}`);
        }
        const fullPath = packageDirectory.directoryPath + filename;

        const entry: PackageDirectoryEntry = {
          type,
          filename,
          fullPath,
          fileSize
        };
        packageDirectory.entries.push(entry);
      }
    }
    if (!jarMetadataFound) {
      throw new Error(`No jar metadata found in directory listing`);
    }
    return packageDirectory;
  }

  public async getDirectory(pathUrl: string): Promise<PackageDirectory> {
    if (!pathUrl.startsWith('/') || !pathUrl.endsWith('/')) {
      throw new Error(`Invalid path: ${pathUrl}`);
    }
    const response = await fetch(pathUrl);
    const text = await response.text();
    const packageDirectory = this.parseDirectoryListing(text);
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
        paths.push(entry.fullPath);
      } else if (entry.type == 'directory') {
        paths.push(... await this.getFilePathsInternal(entry.fullPath));
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
}

ServiceRegistry.getInstance().registerService('DirectoryListingService', DirectoryListingService.getInstance());
