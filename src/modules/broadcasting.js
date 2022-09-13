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

const shadows = new WeakMap;
export class WebExtensionsBroadcastChannel extends EventTarget {
  constructor(channel) {
    super();
    Reflect.defineProperty(this, 'name', {value: String(channel)});
    shadows.set(this, {
      onmessage: null,
      internalHandler: (msg) => {
        if ('object' != typeof msg || null === msg) return;
        if (!msg.broadcastChannel) return;
        const {channel, message} = msg.broadcastChannel;
        if (this.name !== channel) return;
        const ev = new MessageEvent('message', {
          data: message,
        });
        this.dispatchEvent(ev);
      },
      closed: false,
    });
    const shadow = shadows.get(this);
    browser.runtime.onMessage.addListener(shadow.internalHandler);
  }

  get onmessage() {
    const shadow = shadows.get(this);
    return shadow.onmessage;
  }

  set onmessage(handler) {
    const shadow = shadows.get(this);
    if ('function' == typeof shadow.onmessage) {
      this.removeEventListener('message', shadow.onmessage);
    }
    try {
      this.addEventListener('message', handler);
      shadow.onmessage = handler;
    } catch (e) {
      shadow.onmessage = null;
    }
  }

  close() {
    const shadow = shadows.get(this);
    shadow.closed = true;
    browser.runtime.onMessage.removeListener(shadow.internalHandler);
  }

  postMessage(msg) {
    const shadow = shadows.get(this);
    if (shadow.closed) {
      throw new DOMError('InvalidStateError', 'InvalidStateError');
    }
    const message = {
      broadcastChannel: {
        channel: this.name,
        message: msg,
      }
    };
    browser.runtime.sendMessage(message).catch((e) => {
      console.debug(e);
    });
    shadow.internalHandler(message);
  }
}
