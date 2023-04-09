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

import { MessagingService, assertTopLevel, ExtensionService } from "weeg-utils";

export type BroadcastListener<T> = (message: T) => void;

const extensionService = ExtensionService.getInstance();
const messagingService = MessagingService.getInstance();

/**
 * This does not send back messages to the sender script.
 */
export class BroadcastTopic<T> {
  public readonly topic: string;

  public constructor(topic: string) {
    if (extensionService.isBackgroundPage()) {
      assertTopLevel();
    }
    this.topic = topic;
  }

  public broadcast(message: T): void {
    messagingService.sendMessageAndIgnoreResponse(this.topic, message);
  }

  public addListener(listener: BroadcastListener<T>): void {
    messagingService.addListener(this.topic, (message) => {
      listener(message as T);
    });
  }
}
