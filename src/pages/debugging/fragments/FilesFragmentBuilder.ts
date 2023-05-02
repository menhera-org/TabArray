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

// this is not translated.

import { DirectoryListingService } from "../../../lib/package/DirectoryListingService";
import { PackageIntegrityService } from "../../../lib/package/PackageIntegrityService";

import { AbstractFragmentBuilder } from "../../popup-v2/fragments/AbstractFragmentBuilder";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";

const directoryListingService = DirectoryListingService.getInstance();
const packageIntegrityService = PackageIntegrityService.getInstance();

export class FilesFragmentBuilder extends AbstractFragmentBuilder {

  public getFragmentId(): string {
    return 'fragment-files';
  }

  public getLabelText(): string {
    return "Files";
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/folder.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();

    const files = document.createElement('div');
    files.id = "files";
    fragment.appendChild(files);

    const filesHeader = document.createElement('div');
    filesHeader.id = "files-header";
    files.appendChild(filesHeader);

    const filesHeaderPath = document.createElement('div');
    filesHeaderPath.id = "files-header-path";
    filesHeader.appendChild(filesHeaderPath);
    filesHeaderPath.textContent = 'Path';

    const filesHeaderRecordedIntegrity = document.createElement('div');
    filesHeaderRecordedIntegrity.id = "files-header-recorded-integrity";
    filesHeader.appendChild(filesHeaderRecordedIntegrity);
    filesHeaderRecordedIntegrity.textContent = 'Recorded Integrity';

    const filesHeaderCurrentIntegrity = document.createElement('div');
    filesHeaderCurrentIntegrity.id = "files-header-current-integrity";
    filesHeader.appendChild(filesHeaderCurrentIntegrity);
    filesHeaderCurrentIntegrity.textContent = 'Current Integrity';

    Promise.resolve().then(() => {
      this.render();
    });

    return fragment;
  }

  public render(): void {
    const files = this.getFragment().querySelector('#files') as HTMLDivElement;
    Promise.all([
      directoryListingService.getFilePaths(),
      packageIntegrityService.getRecordedIntegrityListing(),
      packageIntegrityService.getIntegrityListing(),
    ]).then(([filePaths, recordedIntegrityListing, integrityListing]) => {
      for (const path of filePaths) {
        const recordedIntegrity = recordedIntegrityListing[path] ?? '';
        const currentIntegrity = integrityListing[path] ?? '';
        const encodedPath = directoryListingService.encodePath(path);

        const fileElement = document.createElement('div');
        fileElement.classList.add('file');
        files.appendChild(fileElement);

        const filePathElement = document.createElement('div');
        filePathElement.classList.add('file-path');
        fileElement.appendChild(filePathElement);

        const filePathLink = document.createElement('a');
        filePathLink.classList.add('file-path-link');
        filePathLink.textContent = path;
        filePathLink.href = new URL(encodedPath, location.href).href;
        filePathLink.target = '_blank';
        filePathElement.appendChild(filePathLink);

        const recordedIntegrityElement = document.createElement('div');
        recordedIntegrityElement.classList.add('file-recorded-integrity');
        recordedIntegrityElement.textContent = recordedIntegrity;
        fileElement.appendChild(recordedIntegrityElement);

        const currentIntegrityElement = document.createElement('div');
        currentIntegrityElement.classList.add('file-current-integrity');
        currentIntegrityElement.textContent = currentIntegrity;
        fileElement.appendChild(currentIntegrityElement);

        if (recordedIntegrity !== currentIntegrity) {
          fileElement.classList.add('file-integrity-changed');
        }
      }
    }).catch((e) => {
      console.error(e);
    });
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.backButtonEnabled = false;

    topBarElement.headingText = 'Files';
  }

  public override getFocusableElements(): HTMLElement[] {
    return [];
  }
}
