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

// this is not translated.

import { DirectoryListingService } from '../../../lib/package/DirectoryListingService';
import { PackageIntegrityService } from '../../../lib/package/PackageIntegrityService';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';

import { DebuggingScreenProps, useLoaded } from './common';

export type FileIntegrity = { path: string; href: string; recorded: string; current: string };

/** Every packaged file with the integrity recorded at build time and the one computed now. */
export const loadFileIntegrities = async (): Promise<FileIntegrity[]> => {
  const directoryListingService = DirectoryListingService.getInstance();
  const packageIntegrityService = PackageIntegrityService.getInstance();
  const [paths, recorded, current] = await Promise.all([
    directoryListingService.getFilePaths(),
    packageIntegrityService.getRecordedIntegrityListing(),
    packageIntegrityService.getIntegrityListing(),
  ]);
  return paths.map((path) => ({
    path,
    href: new URL(directoryListingService.encodePath(path), location.href).href,
    recorded: recorded[path] ?? '',
    current: current[path] ?? '',
  }));
};

export const FileTable = ({ files }: { files: FileIntegrity[] }) => (
  <div id="files">
    <div id="files-header">
      <div id="files-header-path">Path</div>
      <div id="files-header-recorded-integrity">Recorded Integrity</div>
      <div id="files-header-current-integrity">Current Integrity</div>
    </div>
    {files.map((file) => (
      <div key={file.path} className={`file ${file.recorded !== file.current ? 'file-integrity-changed' : ''}`}>
        <div className="file-path">
          <a className="file-path-link" href={file.href} target="_blank">
            {file.path}
          </a>
        </div>
        <div className="file-recorded-integrity">{file.recorded}</div>
        <div className="file-current-integrity">{file.current}</div>
      </div>
    ))}
  </div>
);

export const FilesScreen = ({ active }: DebuggingScreenProps) => {
  const files = useLoaded(loadFileIntegrities);
  return (
    <>
      <ScreenTopBar active={active} heading="Files" />
      <FileTable files={files ?? []} />
    </>
  );
};
