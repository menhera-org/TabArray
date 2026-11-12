import { describe, expect, it } from 'vitest';

import { findContainerForUrl, normalizeHosts } from './ExternalLinkSettings';

describe('normalizeHosts', () => {
  it('keeps only lowercase host names', () => {
    expect(normalizeHosts(' https://Example.com/path?q, *.foo.org\nbar.net:8080 .baz.io. example.com ')).toBe(
      'example.com, foo.org, bar.net, baz.io'
    );
    expect(normalizeHosts(' , ')).toBe('');
  });
});

describe('findContainerForUrl', () => {
  const hosts = {
    'firefox-container-1': 'example.com, foo.org',
    'firefox-container-2': 'mail.example.com',
    'firefox-default': 'public.foo.org',
  };

  it('matches a site and its subdomains, the most specific site first', () => {
    expect(findContainerForUrl(hosts, 'https://example.com/')).toBe('firefox-container-1');
    expect(findContainerForUrl(hosts, 'https://www.example.com/a')).toBe('firefox-container-1');
    expect(findContainerForUrl(hosts, 'https://inbox.mail.example.com/')).toBe('firefox-container-2');
    expect(findContainerForUrl(hosts, 'https://public.foo.org/')).toBe('firefox-default');
  });

  it('does not match other hosts', () => {
    expect(findContainerForUrl(hosts, 'https://notexample.com/')).toBeUndefined();
    expect(findContainerForUrl(hosts, 'https://example.com.evil.net/')).toBeUndefined();
    expect(findContainerForUrl(hosts, 'not a url')).toBeUndefined();
  });
});
