/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

import { useEffect, useState } from 'react';

import { DirectoryListingService } from '../../lib/package/DirectoryListingService';
import type { PackageDirectory, PackageDirectoryEntry } from '../../lib/package/PackageDirectory';

const directoryListingService = DirectoryListingService.getInstance();

/** Where an entry's link goes: the listing page for a directory, the file itself for a file. */
const entryHref = (entry: PackageDirectoryEntry): string => {
  const path = directoryListingService.decodePath(entry.fullPath);
  return entry.type == 'directory'
    ? directoryListingService.getListingPageUrl(path)
    : directoryListingService.encodePath(path);
};

/** The listing of one directory in the extension package. `path` is decoded and ends with "/". */
export const DirectoryApp = ({ path }: { path: string }) => {
  const [directory, setDirectory] = useState<PackageDirectory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    directoryListingService.getDirectory(path).then(setDirectory, (e) => setError(String(e)));
  }, [path]);

  if (error != null) return <p className="error">{error}</p>;
  if (directory == null) return null;

  const parent: PackageDirectoryEntry = {
    type: 'directory',
    filename: '..',
    fullPath: path.replace(/[^/]+\/$/, ''),
    fileSize: 0,
  };
  const entries = path == '/' ? directory.entries : [parent, ...directory.entries];

  return (
    <table>
      <thead>
        <tr>
          <th>filename</th>
          <th>content-length</th>
          <th>file-type</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.fullPath}>
            <td>
              <a href={entryHref(entry)}>
                <span className={`icon icon-${entry.type == 'directory' ? 'directory' : 'file'}`} />
                {directoryListingService.decodePath(entry.filename)}
              </a>
            </td>
            <td>{entry.fileSize}</td>
            <td>{entry.type.toUpperCase()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
