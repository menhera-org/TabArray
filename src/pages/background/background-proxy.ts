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
import { HostnameService } from 'weeg-domains';

import { ProxySettings } from '../../lib/proxies/ProxySettings';
import { ProxyType } from '../../lib/proxies/ProxyType';
import { ProxyInfo } from '../../lib/proxies/ProxyInfo';
import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TabGroupService } from '../../lib/tabGroups/TabGroupService';

import { config } from '../../config/config';

const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const tabGroupService = TabGroupService.getInstance();
const hostnameService = HostnameService.getInstance();
const proxySettings = ProxySettings.getInstance();

// not surviving script restarts, but that's fine
const pendingRequestIds = new Set<string>();

const getProxyStatus = (cookieStoreId: string) => Promise.all([
  proxySettings.getProxyForTabGroup(cookieStoreId),
  config['feature.containerProxy'].getValue(),
]).then(([proxy, proxyEnabled]) => {
  return { proxy, proxyEnabled};
});

const handleCompleted = (details: { requestId: string }) => {
  pendingRequestIds.delete(details.requestId);
};

const isUrlLocalhost = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    if (hostnameService.isHostnameLocalhost(urlObj.hostname)) {
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Failed to parse URL', url, e);
    return false;
  }
};

contextualIdentityFactory.onRemoved.addListener((contextualIdentity) => {
  const cookieStoreId = contextualIdentity.cookieStore.id;
  proxySettings.removeTabGroup(cookieStoreId).catch((e) => {
    console.error(e);
  });
});

tabGroupService.directory.onChanged.addListener(async () => {
  const availableTabGroupIds = await tabGroupService.getTabGroupIds();
  proxySettings.removeUnknownTabGroupIds(availableTabGroupIds).catch((e) => {
    console.error(e);
  });
});

proxySettings.presetStore.onChanged.addListener(() => {
  proxySettings.removeUnknownPresetIds().catch((e) => {
    console.error(e);
  });
});

browser.webRequest.onCompleted.addListener(handleCompleted, {
  urls: ['<all_urls>'],
});

browser.webRequest.onErrorOccurred.addListener(handleCompleted, {
  urls: ['<all_urls>'],
});

browser.webRequest.onAuthRequired.addListener(async (details) => {
  try {
    if (!details.isProxy || !details.cookieStoreId) {
      return {};
    }
    if (pendingRequestIds.has(details.requestId)) {
      return { cancel: true };
    }
    const proxyInfo = (details as unknown as { proxyInfo?: ProxyInfo }).proxyInfo;
    if (!proxyInfo || proxyInfo.type != 'http' && proxyInfo.type != 'https') {
      return {};
    }
    const {proxy, proxyEnabled} = await getProxyStatus(details.cookieStoreId);
    if (!proxyEnabled || !proxy || !ProxyType.isHttpType(proxy.type)) {
      return {};
    }
    if (proxyInfo.host != proxy.host || proxyInfo.port != proxy.port || proxyInfo.type == 'http' && proxy.type != 'http' || proxyInfo.type == 'https' && proxy.type != 'https') {
      return {};
    }
    const username = proxy.username ?? '';
    const password = proxy.password ?? '';
    pendingRequestIds.add(details.requestId);
    return {
      authCredentials: {
        username,
        password,
      },
    };
  } catch (e) {
    console.error(e);
    return {};
  }
}, {
  urls: ['<all_urls>'],
}, ['blocking']);

browser.proxy.onRequest.addListener(async (details) => {
  try {
    if (!details.cookieStoreId) {
      console.warn('Proxy request without cookieStoreId');
      return [];
    }
    const {proxy, proxyEnabled} = await getProxyStatus(details.cookieStoreId);
    if (!proxyEnabled || !proxy) {
      return [];
    }
    if (proxy.doNotProxyLocal && isUrlLocalhost(details.url)) {
      return [];
    }
    return ProxyInfo.fromProxyPreset(proxy);
  } catch (e) {
    console.error(e);
    console.warn('Falling back to unusable proxy');
    return ProxyInfo.UNUSABLE_PROXY;
  }
}, {
  urls: ['<all_urls>'],
});

browser.proxy.onError.addListener((error) => {
  console.error('proxy.onError:', error);
});
