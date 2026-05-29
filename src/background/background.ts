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

import { ExternalServiceProvider } from '../lib/ExternalServiceProvider';
import { ContainerTabOpenerService } from '../lib/tabGroups/ContainerTabOpenerService';
import { PageLoaderService } from '../lib/PageLoaderService';
import { ContainerCreatorService } from '../lib/tabGroups/ContainerCreatorService';
import { TabSortingService } from '../lib/tabs/TabSortingService';
import { TabConverterService } from '../lib/tabs/TabConverterService';
import { TabUrlService } from '../lib/tabs/TabUrlService';
import { ConsoleHistoryService } from '../lib/console/ConsoleHistoryService';
import { PerformanceHistoryService } from '../lib/history/PerformanceHistoryService';
import { PackageIntegrityService } from '../lib/package/PackageIntegrityService';
import { InstallationHistoryService } from '../lib/history/InstallationHistoryService';
import { PackageInformationService } from '../lib/package/PackageInformationService';
import { CookieCopyService } from '../lib/cookies/CookieCopyService';

import './background-install-handler';
import './background-index-tab';
import './background-container-observer';
import './background-menus';
import './background-commands';
import './background-tab-lifecycle';
import './background-autodiscard';
import './background-storage-observer';
import './background-redirector';
import './background-tab-sorter';
import './background-activated-tabs';
import './background-content-script-responder';
import './background-set-header';
import './background-content-script-registrar';
import './background-url-change';
import './background-proxy';
import './background-closed-tabs';
import './background-sync';
import './background-omnibox';
import './background-created-tab';
// import './background-update-checker';
import '../api/ApiDefinitions';

// external services must be registered here
ExternalServiceProvider.getInstance();

// background services need to be instantiated here
// so that the listeners are registered
ContainerCreatorService.getInstance<ContainerCreatorService>();
PageLoaderService.getInstance<PageLoaderService>();
ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
TabSortingService.getInstance<TabSortingService>();
TabUrlService.getInstance<TabUrlService>();
ConsoleHistoryService.getInstance<ConsoleHistoryService>();
PerformanceHistoryService.getInstance<PerformanceHistoryService>();
PackageInformationService.getInstance<PackageInformationService>();

// register the tab converter service
TabConverterService.getInstance();

// register the package integrity service
PackageIntegrityService.getInstance();

// register the installation history service
InstallationHistoryService.getInstance();

// register the cookie copy service
CookieCopyService.getInstance();
