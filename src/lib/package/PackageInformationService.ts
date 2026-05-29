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

import { BackgroundService } from "weeg-utils";

import { BuildJson, PackageInformation } from "./PackageInformation";
import { PackageIntegrityService } from "./PackageIntegrityService";
import { BuildMetadataService } from "./BuildMetadataService";
import { InstallationHistoryService } from "../history/InstallationHistoryService";
import { ServiceRegistry } from "../ServiceRegistry";

const packageIntegrityService = PackageIntegrityService.getInstance();
const buildMetadataService = BuildMetadataService.getInstance();
const installationHistoryService = InstallationHistoryService.getInstance();

export class PackageInformationService extends BackgroundService<void, PackageInformation> {
  private _integrityHashCache: string | undefined;
  private _infoCache: PackageInformation | undefined;

  public override getServiceName(): string {
    return 'PackageInformationService';
  }

  protected override initializeBackground(): void {
    // noop
  }

  private async getBuildInfo(): Promise<BuildJson> {
    const res = await fetch('/build.json');
    return res.json();
  }

  private async getComputedHash(): Promise<string> {
    if (undefined !== this._integrityHashCache) {
      return this._integrityHashCache;
    }
    const hash = await packageIntegrityService.getIntegrityHash();
    this._integrityHashCache = hash;
    return hash;
  }

  private async getPackageInformationInternal(): Promise<PackageInformation> {
    if (undefined !== this._infoCache) {
      return this._infoCache;
    }
    const [recordedHash, computedHash, isSigned, buildInfo] = await Promise.all([
      packageIntegrityService.getRecordedIntegrityHash(),
      this.getComputedHash(),
      installationHistoryService.isSigned(),
      this.getBuildInfo(),
    ]);
    let isOfficial = false;
    if (recordedHash == computedHash) {
      try {
        isOfficial = await buildMetadataService.verifySignature(computedHash);
      } catch (_e) {
        // ignore
      }
    }
    const info: PackageInformation = {
      isOfficial,
      isSigned,
      buildInfo,
      recordedHash,
      computedHash,
    };
    this._infoCache = info;
    return info;
  }

  protected override async execute(): Promise<PackageInformation> {
    return this.getPackageInformationInternal();
  }

  public async getPackageInformation(): Promise<PackageInformation> {
    return this.call();
  }
}

ServiceRegistry.getInstance().registerService('PackageInformationService', PackageInformationService.getInstance<PackageInformationService>());
