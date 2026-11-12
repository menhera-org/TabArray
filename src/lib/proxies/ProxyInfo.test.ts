import { expect, test } from 'vitest';

import { ProxyInfo } from './ProxyInfo';
import { ProxyType } from './ProxyType';

const preset = { id: 'p', title: '', type: ProxyType.HTTP, host: 'proxy.example', port: 8080, doNotProxyLocal: false };

test('a preset Firefox would reject blocks the connection instead of going direct', () => {
  expect(ProxyInfo.fromProxyPreset(preset)).toMatchObject({ type: 'http', host: 'proxy.example', port: 8080 });
  for (const bad of [{ port: 0 }, { port: 65536 }, { port: 80.5 }, { host: '' }, { host: 'proxy example' }]) {
    expect(ProxyInfo.fromProxyPreset({ ...preset, ...bad })).toBe(ProxyInfo.UNUSABLE_PROXY);
  }
});
