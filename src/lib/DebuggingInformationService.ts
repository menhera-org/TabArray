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

import { DirectoryListingService } from './package/DirectoryListingService';
import { PackageIntegrityService } from './package/PackageIntegrityService';
import { ConsoleHistoryService } from './console/ConsoleHistoryService';
import { PerformanceHistoryService } from './history/PerformanceHistoryService';
import { InstallationHistoryService } from './history/InstallationHistoryService';
import { WindowTabCountService } from './windows/WindowTabCountService';

import { getSerializedConfig } from '../config/config';

import { ServiceRegistry } from './ServiceRegistry';

/**
 * A website that knows an extension's UUID can recognize this Firefox profile, so the file people share has none:
 * not this extension's, and not those of other extensions in logged addresses.
 */
export const redactUuids = (text: string): string =>
  text.replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi, '(uuid)');

const directoryListingService = DirectoryListingService.getInstance();
const packageIntegrityService = PackageIntegrityService.getInstance();
const consoleHistoryService = ConsoleHistoryService.getInstance<ConsoleHistoryService>();
const performanceHistoryService = PerformanceHistoryService.getInstance<PerformanceHistoryService>();
const installationHistoryService = InstallationHistoryService.getInstance();
const windowTabCountService = WindowTabCountService.getInstance<WindowTabCountService>();

export class DebuggingInformationService {
  private static readonly INSTANCE = new DebuggingInformationService();

  public static getInstance(): DebuggingInformationService {
    return DebuggingInformationService.INSTANCE;
  }

  private constructor() {
    // No-op
  }

  public async getDebuggingInformation(): Promise<string> {
    const packageLocation = await directoryListingService.getPackageLocationUrl();
    const computedIntegrityListing = await packageIntegrityService.getIntegrityListing();
    const consoleLogs = await consoleHistoryService.getEntries();
    const performanceRecords = await performanceHistoryService.getEntries();
    const installationHistory = await installationHistoryService.getValue();
    const windowTabCountHistory = await windowTabCountService.getTabCountHistory();
    const config = await getSerializedConfig();
    const info = {
      packageLocation,
      computedIntegrityListing,
      consoleLogs,
      performanceRecords,
      installationHistory,
      windowTabCountHistory,
      config,
    };
    return redactUuids(JSON.stringify(info, null, 2));
  }
}

ServiceRegistry.getInstance().registerService('DebuggingInformationService', DebuggingInformationService.getInstance());
