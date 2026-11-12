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

import { act } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import { DirectoryListingService } from '../../lib/package/DirectoryListingService';
import { render } from '../../test/render';
import { DirectoryApp } from './DirectoryApp';

const service = DirectoryListingService.getInstance();

afterEach(() => {
  vi.restoreAllMocks();
});

const links = (container: HTMLElement) =>
  [...container.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]);

test('lists a directory with a parent link; directories open the listing page, files open the file', async () => {
  vi.spyOn(service, 'getDirectory').mockResolvedValue({
    packageLocationUrl: '',
    directoryPath: '/img/',
    entries: [
      { type: 'directory', filename: 'icons/', fullPath: '/img/icons/', fileSize: 0 },
      { type: 'file', filename: 'a%20b.svg', fullPath: '/img/a%20b.svg', fileSize: 3 },
    ],
  });
  const { container } = render(<DirectoryApp path="/img/" />);
  await act(async () => {});
  expect(service.getDirectory).toHaveBeenCalledWith('/img/');
  expect(links(container)).toEqual([
    ['..', '/pages/directory/directory.html?path=%2F'],
    ['icons/', '/pages/directory/directory.html?path=%2Fimg%2Ficons%2F'],
    ['a b.svg', '/img/a%20b.svg'],
  ]);
  expect([...container.querySelectorAll('tbody tr')].map((tr) => tr.lastElementChild?.textContent)).toEqual([
    'DIRECTORY',
    'DIRECTORY',
    'FILE',
  ]);
});

test('the root has no parent link', async () => {
  vi.spyOn(service, 'getDirectory').mockResolvedValue({ packageLocationUrl: '', directoryPath: '/', entries: [] });
  const { container } = render(<DirectoryApp path="/" />);
  await act(async () => {});
  expect(links(container)).toEqual([]);
});

test('shows the error when the listing cannot be read', async () => {
  vi.spyOn(service, 'getDirectory').mockRejectedValue(new Error('Invalid path: x'));
  const { container } = render(<DirectoryApp path="x" />);
  await act(async () => {});
  expect(container.textContent).toBe('Error: Invalid path: x');
});
