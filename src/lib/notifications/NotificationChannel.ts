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

import { Asserts } from "weeg-utils";
import { EventSink } from "weeg-events";

import { NotificationService } from "./NotificationService";

const notificationService = NotificationService.getInstance();

export class NotificationChannel {
  public readonly channelId: string;

  public readonly onClicked = new EventSink<void>();

  public constructor(channelId: string) {
    Asserts.assertTopLevelInBackgroundScript();
    this.channelId = channelId;

    notificationService.onClicked.addListener((channelId) => {
      if (channelId === this.channelId) {
        this.onClicked.dispatch();
      }
    });
  }

  public async createBasic(message: string, title?: string): Promise<void> {
    await notificationService.createBasic(this.channelId, message, title);
  }

  public async clear(): Promise<void> {
    await notificationService.clear(this.channelId);
  }
}
