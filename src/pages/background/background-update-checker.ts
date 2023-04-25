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

import { Alarm } from "weeg-utils";

import { NotificationChannel } from "../../lib/notifications/NotificationChannel";
import { ExtensionPageService } from "../../lib/ExtensionPageService";
import { ExtensionListingService } from "../../lib/ExtensionListingService";

import { NotificationChannelId } from "../../defs";

const extensionPageService = ExtensionPageService.getInstance();
const extensionListingService = ExtensionListingService.getInstance();

const alarm = new Alarm("background-update-checker", {
  periodInMinutes: 15,
});

const notificationChannel = new NotificationChannel(NotificationChannelId.NEW_VERSION_AVAILABLE);

notificationChannel.onClicked.addListener(() => {
  extensionPageService.openInBackground(ExtensionPageService.OPTIONS);
  notificationChannel.clear().catch((e) => {
    console.error(e);
  });
});

alarm.onAlarm.addListener(async () => {
  const availableVersion = await extensionListingService.checkForAvailableVersion();
  if (availableVersion == null) return;

  const message = browser.i18n.getMessage("newVersionAvailable", availableVersion);
  notificationChannel.createBasic(message).catch((e) => {
    console.error(e);
  });
});
