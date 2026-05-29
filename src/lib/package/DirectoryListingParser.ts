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

import { PackageDirectory, PackageDirectoryEntry, PackageFileType } from "./PackageDirectory";

/**
 * Parse Firefox's jar listing text.
 */
export class DirectoryListingParser {
  public parse(listing: string, dirPath: string): PackageDirectory {
    const JAR_SCHEME = 'jar:';
    const lines = listing.split('\n').map(line => line.trim()).filter(line => line != '');
    const packageDirectory: PackageDirectory = {
      packageLocationUrl: "",
      directoryPath: dirPath,
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
      void 0;
      // no longer supported in current Firefox
      // throw new Error(`No jar metadata found in directory listing`);
    }
    return packageDirectory;
  }
}
