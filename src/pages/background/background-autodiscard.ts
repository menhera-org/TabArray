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
import { Alarm } from 'weeg-utils';

import { config } from '../../config/config';

const AUTODISCARD_INTERVAL_IN_MINUTES = 5; // 5 minutes

const alarm = new Alarm('tab.autoDiscard', {
  periodInMinutes: AUTODISCARD_INTERVAL_IN_MINUTES,
});

alarm.onAlarm.addListener(async () => {
  const minAge = await config['tab.autoDiscard.minAge'].getValue();
  if (minAge < 0) {
    return;
  }

  // Get all tabs
  const tabs = await browser.tabs.query({});

  // Filter tabs that are not discarded and are older than minAge
  const now = Date.now();
  const tabsToDiscard = tabs.filter((tab) => {
    const url = new URL(tab.url ?? 'about:blank');
    const isHttpScheme = url.protocol.startsWith('http');
    return isHttpScheme && !tab.discarded && !tab.active && !tab.pinned && null != tab.lastAccessed && tab.lastAccessed + minAge * 1000 < now;
  });

  // Discard the tabs
  const tabIdsToDiscard = tabsToDiscard.map((tab) => tab.id).filter((id) => id != null) as number[];
  if (tabIdsToDiscard.length == 0) {
    return;
  }
  try {
    await browser.tabs.discard(tabIdsToDiscard);
    console.debug(`Discarded ${tabIdsToDiscard.length} tab(s)`);
  } catch (e) {
    console.error(e);
  }
});
