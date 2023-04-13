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

import { ServiceRegistry } from "./ServiceRegistry";
import { PageLoaderService } from "./PageLoaderService";

import { PANORAMA_PAGE, ADDON_PAGE, PRIVACY_POLICY_PAGE, GITHUB_PAGE, COOKIES_PAGE } from '../defs';

export type ExtensionPage = 'sidebar' | 'browserAction' | 'pageAction' | 'options' | 'panorama' | 'cookies' | 'amo' | 'privacyPolicy' | 'github';

export class ExtensionPageService {
  public static readonly SIDEBAR: ExtensionPage = 'sidebar';
  public static readonly BROWSER_ACTION: ExtensionPage = 'browserAction';
  public static readonly PAGE_ACTION: ExtensionPage = 'pageAction';
  public static readonly OPTIONS: ExtensionPage = 'options';
  public static readonly PANORAMA: ExtensionPage = 'panorama';
  public static readonly COOKIES: ExtensionPage = 'cookies';
  public static readonly AMO: ExtensionPage = 'amo';
  public static readonly PRIVACY_POLICY: ExtensionPage = 'privacyPolicy';
  public static readonly GITHUB: ExtensionPage = 'github';

  private static readonly INSTANCE = new ExtensionPageService();

  public static getInstance(): ExtensionPageService {
    return this.INSTANCE;
  }

  private readonly _pageLoaderService = PageLoaderService.getInstance<PageLoaderService>();

  private constructor() {
    // Do nothing.
  }

  /**
   * This method must be called on a user action.
   * @param input The page to open.
   */
  public async open(input: ExtensionPage): Promise<void> {
    switch (input) {
      case 'sidebar': {
        await browser.sidebarAction.toggle();
        break;
      }

      case 'browserAction': {
        await browser.browserAction.openPopup();
        break;
      }

      case 'pageAction': {
        await browser.pageAction.openPopup();
        break;
      }

      case 'options': {
        await browser.runtime.openOptionsPage();
        break;
      }

      case 'panorama': {
        await this._pageLoaderService.loadPage(PANORAMA_PAGE);
        break;
      }

      case 'cookies': {
        await this._pageLoaderService.loadPage(COOKIES_PAGE);
        break;
      }

      case 'amo': {
        await this._pageLoaderService.loadPage(ADDON_PAGE);
        break;
      }

      case 'privacyPolicy': {
        await this._pageLoaderService.loadPage(PRIVACY_POLICY_PAGE);
        break;
      }

      case 'github': {
        await this._pageLoaderService.loadPage(GITHUB_PAGE);
        break;
      }
    }
  }

  /**
   * This method must be called on a user action.
   * @param input The page to open.
   */
  public openInBackground(input: ExtensionPage): void {
    this.open(input).catch((e) => {
      console.error(e);
    });
  }
}

ServiceRegistry.getInstance().registerService('ExtensionPageService', ExtensionPageService.getInstance());
