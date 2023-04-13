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
import { LanguageSettings } from './LanguageSettings';
import { UserAgentSettings } from './UserAgentSettings';
import { config } from '../config/config';

const languageSettings = LanguageSettings.getInstance();
const userAgentSettings = UserAgentSettings.getInstance();

let featureLanguageOverridesEnabled = false;
let featureUserAgentOverridesEnabled = false;

config['feature.languageOverrides'].observe((newValue) => {
  featureLanguageOverridesEnabled = newValue;
});

config['feature.uaOverrides'].observe((newValue) => {
  featureUserAgentOverridesEnabled = newValue;
});

const getSecChUa = (cookieStoreId: string) => {
  const userAgent = userAgentSettings.getUserAgent(cookieStoreId);
  const chrome = userAgent.match(/Chrome\/([0-9]+)/);
  if (!chrome) {
    return '';
  }
  const chromeVersion = chrome[1] || '108';
  const brands = [
    {
      "brand": "Not?A_Brand",
      "version": Math.floor(100 * Math.random()).toFixed(0),
    },
    {
      "brand": "Chromium",
      "version": chromeVersion,
    },
    {
      "brand": "Google Chrome",
      "version": chromeVersion,
    },
  ];
  const brandStrings = brands.map((brandInfo) => {
    return `"${brandInfo.brand}";v="${brandInfo.version}"`;
  });
  return brandStrings.join(',');
};

const setHeader = (details: browser.WebRequest.OnBeforeSendHeadersDetailsType, headerName: string, headerValue: string) => {
  let found = false;
  details.requestHeaders?.forEach((header) => {
    if (headerName === header.name.toLowerCase()) {
      header.value = headerValue;
      found = true;
    }
  });
  if (!found) {
    details.requestHeaders?.push({
      name: headerName,
      value: headerValue,
    });
  }
};

browser.webRequest.onBeforeSendHeaders.addListener((details) => {
  if (!details.cookieStoreId) {
    return;
  }

  const cookieStoreId = details.cookieStoreId;

  const userAgent = userAgentSettings.getUserAgent(cookieStoreId);
  if ('' !== userAgent && featureUserAgentOverridesEnabled) {
    setHeader(details, 'user-agent', userAgent);
  }

  const acceptLanguages = languageSettings.getAcceptLanguages(cookieStoreId);
  if ('' !== acceptLanguages && featureLanguageOverridesEnabled) {
    setHeader(details, 'accept-language', acceptLanguages);
  }

  // this feature is only available in secure contexts.
  if (featureUserAgentOverridesEnabled && details.url?.startsWith('https://')) {
    const secChUa = getSecChUa(details.cookieStoreId);
    if ('' !== secChUa) {
      setHeader(details, 'sec-ch-ua', secChUa);
      const secChUaFullVersionList = secChUa.replaceAll(/v="(\d+)"/g, 'v="$1.0.0.0"');
      setHeader(details, 'sec-ch-ua-full-version-list', secChUaFullVersionList);
    }
  }

  return { requestHeaders: details.requestHeaders };
}, {
  urls: ['<all_urls>'],
}, ["blocking", "requestHeaders"]);
