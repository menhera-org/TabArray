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

import { expect, test, vi } from 'vitest';
import type browser from 'webextension-polyfill';

const update = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('webextension-polyfill', () => ({ default: { tabs: { update } } }));

import { openDirectoryListingPage } from './directory-listing';

const tab = (url: string, status = 'complete') => ({ id: 7, url, status }) as browser.Tabs.Tab;

test('sends our own loaded directories to the listing page, and leaves everything else alone', () => {
  openDirectoryListingPage(tab(`${location.origin}/img/`, 'loading'));
  openDirectoryListingPage(tab(`${location.origin}/img/icon.svg`));
  openDirectoryListingPage(tab('https://example.com/img/'));
  openDirectoryListingPage(tab('about:blank'));
  expect(update).not.toHaveBeenCalled();

  openDirectoryListingPage(tab(`${location.origin}/img/a%20b/`));
  expect(update).toHaveBeenCalledWith(7, {
    url: '/pages/directory/directory.html?path=%2Fimg%2Fa+b%2F',
    loadReplace: true,
  });
});
