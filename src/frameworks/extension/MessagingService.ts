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

import browser from 'webextension-polyfill';
import { SetMap } from "../types";

export type MessageListener = (message: unknown, sender: browser.Runtime.MessageSender) => Promise<unknown> | void;

export class MessagingService {
  private static readonly _instance = new MessagingService();

  public static getInstance(): MessagingService {
    return this._instance;
  }

  private readonly _setMap = new SetMap<string, MessageListener>();

  private constructor() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.onMessage(message, sender, sendResponse).catch((e) => {
        console.error(e);
      });
      return true;
    });
  }

  private async onMessage(message: unknown, sender: browser.Runtime.MessageSender, sendResponse: (response: unknown) => void): Promise<unknown> {
    if (null == message || typeof message !== 'object' || !('type' in message) || typeof message.type !== 'string') {
      return;
    }
    const { type } = message;
    const listeners = this._setMap.get(type);
    if (null == listeners || listeners.size < 1) {
      return;
    }
    const payload = ('payload' in message) ? message.payload : undefined;
    const promises = [... listeners].map(listener => listener(payload, sender)).filter(promise => null != promise) as Promise<unknown>[];
    if (0 === promises.length) {
      return;
    }
    const result = await Promise.race(promises);
    console.debug('MessagingService.onMessage', type, message, sender, result);
    sendResponse(result);
    return result;
  }

  public addListener(type: string, listener: MessageListener): void {
    this._setMap.addItem(type, listener);
  }

  public removeListener(type: string, listener: MessageListener): void {
    this._setMap.deleteItem(type, listener);
  }

  public async sendMessage(type: string, message: unknown): Promise<unknown> {
    const result = await browser.runtime.sendMessage({
      type,
      payload: message,
    });
    return result;
  }
}
