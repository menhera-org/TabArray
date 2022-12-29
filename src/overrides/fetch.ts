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
import { OriginAttributes } from '../frameworks/tabGroups';
import { LanguageSettings } from '../languages/LanguageSettings';
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

browser.webRequest.onBeforeSendHeaders.addListener((details) => {
  if (!details.cookieStoreId) {
    return;
  }

  const userAgent = userAgentSettings.getUserAgent(details.cookieStoreId);
  if ('' !== userAgent && featureUserAgentOverridesEnabled) {
    details.requestHeaders?.forEach((header) => {
      if ('user-agent' === header.name.toLowerCase()) {
        header.value = userAgent;
      }
    });
  }

  const originAttributes = OriginAttributes.fromCookieStoreId(details.cookieStoreId);
  const acceptLanguages = languageSettings.getAcceptLanguages(originAttributes);
  if ('' !== acceptLanguages && featureLanguageOverridesEnabled) {
    details.requestHeaders?.forEach((header) => {
      if ('accept-language' === header.name.toLowerCase()) {
        header.value = acceptLanguages;
      }
    });
  }

  // TODO: Sec-CH-UA-* headers.

  return { requestHeaders: details.requestHeaders };
}, {
  urls: ['<all_urls>'],
}, ["blocking", "requestHeaders"]);
