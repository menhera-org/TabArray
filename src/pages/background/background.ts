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

import browser from 'webextension-polyfill';

import { ExternalServiceProvider } from '../../lib/ExternalServiceProvider';
import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';
import { PageLoaderService } from '../../lib/PageLoaderService';
import { ContainerCreatorService } from '../../lib/tabGroups/ContainerCreatorService';
import { TabSortingService } from '../../lib/tabs/TabSortingService';
import { SanityCheckService } from '../../lib/SenityCheckService';

import './background-install-handler';
import './background-index-tab';
import './background-container-observer';
import './background-menus';
import './background-cookie-autoclean';
import './FramingHeadersService';
import './background-commands';
import './background-update-browserAction';
import './background-temporary-containers';
import './background-autodiscard';
import './background-storage-observer';
import './background-active-container';
import './background-redirector';
import './background-tab-sorter';
import './background-activated-tabs';
import './background-content-script-responder';
import { everyMinuteAlarm } from './background-alarms';

import '../../api/ApiDefinitions';
import '../../overrides/fetch';
import '../../overrides/language-content-script';
import { UaContentScriptRegistrar} from '../../overrides/UaContentScriptRegistrar';

// external services must be registered here
ExternalServiceProvider.getInstance();

// background services need to be instantiated here
// so that the listeners are registered
ContainerCreatorService.getInstance<ContainerCreatorService>();
PageLoaderService.getInstance<PageLoaderService>();
ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
TabSortingService.getInstance<TabSortingService>();

// must be instantiated here
new UaContentScriptRegistrar();

// other services used by this script
const sanityCheckService = SanityCheckService.getInstance();

// auto reload the extension if the sanity check fails
everyMinuteAlarm.onAlarm.addListener(() => {
  sanityCheckService.checkForFiles().catch((e) => {
    console.error('Sanity check failed, reloading', e);
    browser.runtime.reload();
  });
});
