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
import { Asserts, ExtensionService } from "weeg-utils";
import { EventSink } from 'weeg-events';

import { ServiceRegistry } from './ServiceRegistry';

const extensionService = ExtensionService.getInstance();

/**
 * You need to use this for something to be executed once for the lifetime of the extension.
 * This does nothing in non-background scripts.
 */
export class StartupService {
  private static readonly INSTANCE = new StartupService();

  public static getInstance(): StartupService {
    return this.INSTANCE;
  }

  private _initialized = false;

  /**
   * For important initializations.
   */
  public readonly onBeforeStartup = new EventSink<void>();

  /**
   * Fired once on startup.
   */
  public readonly onStartup = new EventSink<browser.Runtime.OnInstalledDetailsType>();

  private callHandlers(details: browser.Runtime.OnInstalledDetailsType) {
    if (this._initialized) return;
    this._initialized = true;
    this.onBeforeStartup.dispatch();
    this.onStartup.dispatch(details);
  }

  private constructor() {
    if (extensionService.isBackgroundPage()) {
      Asserts.assertTopLevel();
      browser.runtime.onInstalled.addListener((details) => {
        this.callHandlers(details);
      });
      browser.runtime.onStartup.addListener(() => {
        const details: browser.Runtime.OnInstalledDetailsType = {
          reason: 'install',
          previousVersion: browser.runtime.getManifest().version,
          temporary: false,
        };
        this.callHandlers(details);
      });
    }
  }
}

ServiceRegistry.getInstance().registerService('StartupService', StartupService.getInstance());
