// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
*/

import browser from 'webextension-polyfill';
import { CONFIRM_PAGE } from '../defs';

export type HandlerType = (details: browser.WebRequest.OnBeforeRequestDetailsType) => Promise<boolean>;

export class BeforeRequestHandler {
  private readonly _handler: HandlerType;
  private readonly _rawListener: (details: browser.WebRequest.OnBeforeRequestDetailsType) => Promise<browser.WebRequest.BlockingResponse>;

  public constructor(handler: HandlerType) {
    this._handler = handler;
    this._rawListener = async (details: browser.WebRequest.OnBeforeRequestDetailsType) => {
      const whetherToRedirect = await this._handler(details);
      const result: browser.WebRequest.BlockingResponse = {};
      if (whetherToRedirect) {
        const confirmUrl = browser.runtime.getURL(CONFIRM_PAGE + '?url=' + encodeURIComponent(details.url));
        result.redirectUrl = confirmUrl;
        console.log('Redirecting %s to %s', details.url, confirmUrl);
      }
      return result;
    };
  }

  public startListening() {
    if (browser.webRequest.onBeforeRequest.hasListener(this._rawListener)) {
      return;
    }
    browser.webRequest.onBeforeRequest.addListener(this._rawListener, {
      urls: [
        '*://*/*', // all HTTP/HTTPS requests.
      ],
      types: [
        'main_frame', // top-level windows.
      ],
    }, ['blocking']);
  }

  public stopListening() {
    if (!browser.webRequest.onBeforeRequest.hasListener(this._rawListener)) {
      return;
    }
    browser.webRequest.onBeforeRequest.removeListener(this._rawListener);
  }
}
