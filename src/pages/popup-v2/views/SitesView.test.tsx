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

import { describe, expect, test, vi } from 'vitest';

import { BrowserStateDao } from '../../../lib/states/BrowserStateDao';
import { TabDao } from '../../../lib/states/TabDao';
import { IndexTab } from '../../../lib/tabs/IndexTab';

import { render } from '../../../test/render';
import { SitesView, getSiteSummaries } from './SitesView';
import { getFocusableElements } from './focus';
import { cssUrl } from './TabFavicon';

const tab = (id: number, url: string, lastAccessed: number, title = `Tab ${id}`): TabDao => ({
  id,
  url,
  title,
  favIconUrl: `https://example.com/${id}.ico`,
  windowId: 1,
  discarded: false,
  hidden: false,
  active: false,
  pinned: false,
  index: id,
  isSharing: false,
  lastAccessed,
  muted: false,
  audible: false,
  cookieStoreId: 'firefox-default',
});

const state = (tabs: TabDao[], tabIdsBySite: Record<string, number[]>): BrowserStateDao =>
  ({
    tabs: Object.fromEntries(tabs.map((t) => [t.id, t])),
    tabIdsBySite,
  }) as unknown as BrowserStateDao;

describe('getSiteSummaries', () => {
  test('uses the most recently used tab and counts the tabs', () => {
    const summaries = getSiteSummaries(
      state([tab(1, 'https://a.example.com/', 10), tab(2, 'https://b.example.com/', 30, 'Newest')], {
        'example.com': [1, 2],
      })
    );
    expect(summaries).toEqual([
      { domain: 'example.com', tabCount: 2, favIconUrl: 'https://example.com/2.ico', title: 'Newest' },
    ]);
  });

  test('sorts sites by domain and skips sites with only index tabs', () => {
    const indexUrl = IndexTab.getUrl('Work', '', '#000', '').url;
    const summaries = getSiteSummaries(
      state([tab(1, 'https://zeta.org/', 1), tab(2, 'https://alpha.com/', 1), tab(3, indexUrl, 1)], {
        'zeta.org': [1],
        'alpha.com': [2],
        'index.invalid': [3],
      })
    );
    expect(summaries.map((s) => s.domain)).toEqual(['alpha.com', 'zeta.org']);
  });
});

describe('SitesView', () => {
  const sites = [
    { domain: 'example.com', tabCount: 2, favIconUrl: '', title: 'Example' },
    { domain: '', tabCount: 1, favIconUrl: 'https://x/a.ico', title: 'Other' },
  ];

  test('shows each site with its tab count and latest tab', () => {
    const { container } = render(<SitesView sites={sites} onSiteClick={() => {}} onSiteClose={() => {}} />);
    const rows = [...container.querySelectorAll('[data-popup-focusable]')];
    // The site, then its latest tab's title, then the number of tabs.
    expect(rows.map((row) => row.textContent)).toEqual(['example.comExample2', '(null)Other1']);
  });

  test('reports clicks and closes with the real domain', () => {
    const onSiteClick = vi.fn();
    const onSiteClose = vi.fn();
    const { container, click } = render(
      <SitesView sites={sites} onSiteClick={onSiteClick} onSiteClose={onSiteClose} />
    );
    const focusable = getFocusableElements(container);
    expect(focusable).toHaveLength(2);
    click(focusable[1] ?? null);
    expect(onSiteClick).toHaveBeenCalledWith('');
    click(container.querySelectorAll('button:not([data-popup-focusable])')[0] ?? null);
    expect(onSiteClose).toHaveBeenCalledWith('example.com');
  });

  test('masks the default favicon and shows other favicons as they are', () => {
    const { container } = render(<SitesView sites={sites} onSiteClick={() => {}} onSiteClose={() => {}} />);
    const icons = [...container.querySelectorAll<HTMLElement>('span[style]')];
    expect(icons[0]?.style.maskImage).toContain('defaultFavicon.svg');
    expect(icons[1]?.style.backgroundImage).toContain('https://x/a.ico');
  });
});

test('cssUrl quotes the URL so it cannot end the url() early', () => {
  expect(cssUrl('https://x/"a").ico')).toBe('url("https://x/\\"a\\").ico")');
});
