/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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
import { Asserts, ExtensionService } from 'weeg-utils';

export type BroadcastListener<T> = (message: T) => void;

type Envelope = { topic: string; message: unknown };

const PORT_NAME = 'broadcast-topic';
const isBackground = ExtensionService.getInstance().isBackgroundPage();
const listeners = new Map<string, Set<BroadcastListener<unknown>>>();

const dispatch = ({ topic, message }: Envelope) => {
  for (const listener of listeners.get(topic) ?? []) listener(message);
};

/*
  Broadcasts go over ports, not runtime.sendMessage: since Firefox 154, a message that reaches an
  extension page without a runtime.onMessage listener (one still loading, say) makes Firefox log an
  uncaught exception. A page connects to the background when it first listens or broadcasts; the
  background posts to the connected pages and relays what one page sends to the others.
*/
const pagePorts = new Set<browser.Runtime.Port>();

const postToPages = (envelope: Envelope, except?: browser.Runtime.Port) => {
  for (const port of pagePorts) {
    if (port === except) continue;
    try {
      port.postMessage(envelope);
    } catch {
      pagePorts.delete(port); // closed without a disconnect event yet
    }
  }
};

if (isBackground) {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name != PORT_NAME) return;
    pagePorts.add(port);
    port.onDisconnect.addListener(() => pagePorts.delete(port));
    port.onMessage.addListener((envelope) => {
      postToPages(envelope as Envelope, port);
      dispatch(envelope as Envelope);
    });
  });
}

let backgroundPort: browser.Runtime.Port | undefined;

const getBackgroundPort = () => {
  if (!backgroundPort) {
    backgroundPort = browser.runtime.connect({ name: PORT_NAME });
    backgroundPort.onMessage.addListener((envelope) => dispatch(envelope as Envelope));
  }
  return backgroundPort;
};

/**
 * A topic shared by the background page and the extension's pages. A broadcast reaches every
 * other context listening to the topic, but not the sender.
 */
export class BroadcastTopic<T> {
  public readonly topic: string;

  public constructor(topic: string) {
    Asserts.assertTopLevelInBackgroundScript();
    this.topic = topic;
  }

  public broadcast(message: T): void {
    const envelope: Envelope = { topic: this.topic, message };
    if (isBackground) {
      postToPages(envelope);
    } else {
      getBackgroundPort().postMessage(envelope);
    }
  }

  public addListener(listener: BroadcastListener<T>): void {
    let set = listeners.get(this.topic);
    if (!set) listeners.set(this.topic, (set = new Set()));
    set.add(listener as BroadcastListener<unknown>);
    if (!isBackground) getBackgroundPort();
  }
}
