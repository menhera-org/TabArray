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

import { StartupService } from '../lib/StartupService';
import { CompatConsole } from '../lib/console/CompatConsole';

import { ADDON_PAGE } from '../defs';
import { MIGRATIONS } from './includes/extension-version-migrations';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const startupService = StartupService.getInstance();

startupService.onStartup.addListener((details) => {
  const previousVersion = details.previousVersion ?? '0';
  const newVersion = browser.runtime.getManifest().version;
  console.info('onInstalled: %s -> %s', previousVersion, newVersion);
  MIGRATIONS.migrate(previousVersion, newVersion).catch((e) => {
    console.error(e);
  });
});

browser.runtime.setUninstallURL(ADDON_PAGE).catch((e) => console.error(e));
