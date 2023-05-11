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
import { Asserts } from 'weeg-utils';

import { CompatConsole } from '../../lib/console/CompatConsole';

// throws an error if not in background script
Asserts.assertBackgroundScript();

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

/**
 * A service that modifies the headers of frames to allow them to be
 * loaded in this extension's pages.
 */
export class FramingHeadersService {
  private static readonly _INSTANCE = new FramingHeadersService();

  public static getInstance(): FramingHeadersService {
    return this._INSTANCE;
  }

  private constructor() {
    browser.webRequest.onHeadersReceived.addListener(
      this.onHeadersReceived.bind(this),
      {
        urls: ['<all_urls>'],
        types:  ['sub_frame'],
      },
      ['blocking', 'responseHeaders']
    );

  }

  private setHeader(details: browser.WebRequest.OnHeadersReceivedDetailsType, headerName: string, headerValue: string) {
    let found = false;
    details.responseHeaders?.forEach((header) => {
      if (headerName === header.name.toLowerCase()) {
        header.value = headerValue;
        found = true;
      }
    });
    if (!found) {
      details.responseHeaders?.push({
        name: headerName,
        value: headerValue,
      });
    }
  }

  private removeFrameOptions(details: browser.WebRequest.OnHeadersReceivedDetailsType): boolean {
    let removed = false;
    if (!details.responseHeaders) {
      return removed;
    }
    for (let i = details.responseHeaders.length - 1; i >= 0; i--) {
      const header = details.responseHeaders[i];
      if (!header) continue;
      if (['x-frame-options', 'frame-options'].includes(header.name.toLowerCase())) {
        details.responseHeaders.splice(i, 1);
        removed = true;
      }
    }
    return removed;
  }

  private removeCspFrameAncestors(details: browser.WebRequest.OnHeadersReceivedDetailsType): boolean {
    let removed = false;
    if (!details.responseHeaders) {
      return removed;
    }
    for (let i = details.responseHeaders.length - 1; i >= 0; i--) {
      const header = details.responseHeaders[i];
      if (!header || !header.value) continue;
      if (['content-security-policy', 'content-security-policy-report-only'].includes(header.name.toLowerCase())) {
        const oldHeaderValue = header.value;
        header.value = header.value.replace(/frame-ancestors[^;]*;?/g, '');
        if (oldHeaderValue !== header.value) {
          removed = true;
        }
      }
    }
    return removed;
  }

  private onHeadersReceived(details: browser.WebRequest.OnHeadersReceivedDetailsType) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const frameAncestors = (details as any).frameAncestors as {
      frameId: number;
      url: string;
    }[];
    if (frameAncestors.length < 1) {
      return;
    }

    // if there is any ancestor that is not from this extension, we do not
    // want to do anything
    for (const ancestor of frameAncestors) {
      const url = new URL(ancestor.url);
      if (url.origin !== location.origin) {
        return;
      }
    }

    // only allow framing from our own extension
    const parentUrl = frameAncestors[0]?.url;
    if (this.removeFrameOptions(details)) {
      console.log('removed x-frame-options for %s on %s', details.url, parentUrl);
    }
    if (this.removeCspFrameAncestors(details)) {
      console.log('removed csp frame-ancestors for %s on %s', details.url, parentUrl);
    }
    return { responseHeaders: details.responseHeaders };
  }
}
