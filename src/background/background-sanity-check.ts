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

import browser from 'webextension-polyfill';

import { SanityCheckService } from '../lib/SanityCheckService';
import { CompatConsole } from '../lib/console/CompatConsole';

import { everyMinuteAlarm } from './includes/alarms';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

// The background page outlives its files when the XPI or the add-on's directory is replaced or removed.
// Reloading then loads the files that are there now, or unloads the extension.
everyMinuteAlarm.onAlarm.addListener(() => {
  SanityCheckService.getInstance()
    .checkForFiles()
    .catch((e) => {
      console.error('Sanity check failed, reloading', e);
      browser.runtime.reload();
    });
});
