// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import { ContentStorageStatistics } from './ContentStorageStatistics';
import { CookieStore } from '../frameworks/tabAttributes';
import { FirstPartyService } from '../frameworks/tabGroups';
import { MessagingService } from '../frameworks/extension/MessagingService';

const statistics = new ContentStorageStatistics();
const firstPartyService = FirstPartyService.getInstance();
const messagingService = MessagingService.getInstance();

messagingService.addListener('content-localstorage-statistics', async (message, sender) => {
  if (!sender.tab) return;
  if (!sender.tab.cookieStoreId) return;
  if (null == message || typeof message != 'object' || !('origin' in message) || !('localStorageLength' in message)) return;

  const { cookieStoreId } = sender.tab;

  // Ignore private tabs so that we don't leak data from the private browsing
  if (cookieStoreId == CookieStore.PRIVATE.id) return;

  // Top frame URL can be about:blank for popups. This is the limitation of the API.
  const topFrameUrl = sender.frameId == 0
    ? message.origin as string
    : (sender.tab.url || 'about:blank');

  await firstPartyService.initialized;
  const firstPartyDomain = firstPartyService.getRegistrableDomain(new URL(topFrameUrl));

  const origin = message.origin as string;
  statistics.setOriginStatistics(cookieStoreId, firstPartyDomain, origin, {
    origin,
    hasLocalStorage: 0 < (message.localStorageLength as number),
  });
});
