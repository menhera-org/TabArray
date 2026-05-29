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

import browser from "webextension-polyfill";
import { StorageItem } from "weeg-storage";
import { EventSink } from "weeg-events";
import { Asserts } from "weeg-utils";

import { ServiceRegistry } from "../ServiceRegistry";
import { StartupService } from "../StartupService";
import { PackageIntegrityService } from "../package/PackageIntegrityService";

export type InstallationInfo = {
  installationDate: string;
  commit: string;
  untracked: boolean;
  signed: boolean;
  buildDate: string;
  recordedIntegrity: string;
  computedIntegrity: string;
  browserName: string;
  browserVersion: string;
  browserPlatformOs: string;
};

const startupService = StartupService.getInstance();
const packageIntegrityService = PackageIntegrityService.getInstance();

export class InstallationHistoryService {
  private static readonly INSTANCE = new InstallationHistoryService();

  public static getInstance(): InstallationHistoryService {
    return InstallationHistoryService.INSTANCE;
  }

  public readonly onChanged = new EventSink<InstallationInfo[]>();
  private readonly _storage = new StorageItem<InstallationInfo[]>('installationHistory', [], StorageItem.AREA_LOCAL);

  private constructor() {
    Asserts.assertTopLevelInBackgroundScript();
    startupService.onStartup.addListener(() => {
      this.getCurrentInstallation().then((installation) => {
        return this.appendValue(installation);
      }).catch((e) => {
        console.error(e);
      });
    })

    this._storage.onChanged.addListener((value) => {
      this.onChanged.dispatch(value);
    });
  }

  public async getValue(): Promise<InstallationInfo[]> {
    return await this._storage.getValue();
  }

  private async setValue(value: InstallationInfo[]): Promise<void> {
    await this._storage.setValue(value);
  }

  private async appendValue(value: InstallationInfo): Promise<void> {
    const values = await this.getValue();
    if (values.length > 0) {
      const lastValue = values[values.length - 1] as InstallationInfo;
      if (this.installationEquals(lastValue, value)) {
        return;
      }
    }
    values.push(value);
    await this.setValue(values);
  }

  public async isSigned(): Promise<boolean> {
    let signed = false;
    try {
      const signatureResponse = await fetch('/META-INF/manifest.mf');
      if (signatureResponse.status != 200) {
        throw new Error(`Unexpected status code ${signatureResponse.status}`);
      }
      await signatureResponse.text();
      signed = true;
    } catch (_e) {
      // ignore
    }
    return signed;
  }

  public async getCurrentInstallation(): Promise<InstallationInfo> {
    const [recordedIntegrity, computedIntegrity, buildInfo, browserInfo, platformInfo, signed] = await Promise.all([
      packageIntegrityService.getRecordedIntegrityHash(),
      packageIntegrityService.getIntegrityHash(),
      fetch('/build.json').then((res) => res.json()),
      browser.runtime.getBrowserInfo(),
      browser.runtime.getPlatformInfo(),
      this.isSigned(),
    ]);
    const browserName = browserInfo.name;
    const browserVersion = browserInfo.version;
    const browserPlatformOs = platformInfo.os;
    const { commit, untracked, buildDate } = buildInfo as { commit: string; untracked: boolean; buildDate: string; };
    return {
      installationDate: new Date().toISOString(),
      commit,
      untracked,
      signed,
      buildDate,
      recordedIntegrity,
      computedIntegrity,
      browserName,
      browserVersion,
      browserPlatformOs,
    };
  }

  public installationEquals(a: InstallationInfo, b: InstallationInfo): boolean {
    // ignore installationDate
    return a.commit === b.commit &&
      a.untracked === b.untracked &&
      a.signed === b.signed &&
      a.buildDate === b.buildDate &&
      a.recordedIntegrity === b.recordedIntegrity &&
      a.computedIntegrity === b.computedIntegrity &&
      a.browserName === b.browserName &&
      a.browserVersion === b.browserVersion &&
      a.browserPlatformOs === b.browserPlatformOs;
  }
}

ServiceRegistry.getInstance().registerService('InstallationHistoryService', InstallationHistoryService.getInstance());
