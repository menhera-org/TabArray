
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
        browser.runtime.sendMessage(message).catch(e => {});
        shadow.internalHandler(message);
    }
}
