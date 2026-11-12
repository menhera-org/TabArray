import { afterEach, describe, expect, it, vi } from 'vitest';

import { SanityCheckService } from './SanityCheckService';

describe('SanityCheckService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes while the files load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 200 }))
    );
    await expect(SanityCheckService.getInstance().checkForFiles()).resolves.toBeUndefined();
  });

  it('fails when a file is gone or does not load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 }))
    );
    await expect(SanityCheckService.getInstance().checkForFiles()).rejects.toThrow('404');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('NetworkError')))
    );
    await expect(SanityCheckService.getInstance().checkForFiles()).rejects.toThrow('NetworkError');
  });
});
