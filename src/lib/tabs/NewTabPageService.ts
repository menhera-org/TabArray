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
import { EventSink } from "weeg-events";

import { ServiceRegistry } from "../ServiceRegistry";

export class NewTabPageService {
  private static readonly INSTANCE = new NewTabPageService();

  public static getInstance(): NewTabPageService {
    return this.INSTANCE;
  }

  public readonly newTabPageUrlChanged = new EventSink<string>();

  private constructor() {
    browser.browserSettings.newTabPageOverride.onChange.addListener((details) => {
      if (!details) return;
      if (!details.value) return;
      this.newTabPageUrlChanged.dispatch(details.value);
    });
  }

  public async getNewTabPageUrl(): Promise<string> {
    const details = await browser.browserSettings.newTabPageOverride.get({});
    if (!details.value) {
      return "about:newtab";
    }
    return details.value;
  }
}

ServiceRegistry.getInstance().registerService('NewTabPageService', NewTabPageService.getInstance());
