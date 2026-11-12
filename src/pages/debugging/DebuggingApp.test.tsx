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
import { expect, test } from 'vitest';

import { render } from '../../test/render';
import { DebuggingApp } from './DebuggingApp';
import { CHART_URL } from './views/TabCountView';

test('switches between the debugging screens, each with its own heading', async () => {
  const { container: root, click } = render(<DebuggingApp />);
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  const shown = () => root.querySelector('[id^="fragment-"]:not([hidden])')?.id;
  const heading = () => root.querySelector('h1')?.textContent;
  expect([shown(), heading()]).toEqual(['fragment-log', 'Logs']);
  const expected = [
    ['fragment-performance', 'Performance'],
    ['fragment-files', 'Files'],
    ['fragment-hisotry', 'Installation History'],
    ['fragment-tab-count', 'Tab Count'],
  ];
  for (const [id, title] of expected) {
    click(root.querySelector(`[data-target-id="${id}"]`));
    expect([shown(), heading()]).toEqual([id, title]);
  }
  expect(root.querySelector('iframe#time-chart')?.getAttribute('src')).toBe(CHART_URL);
  // Outside the popup, the overflow menu offers to open the popup, and the drawer holds the banner.
  expect(root.querySelector('[title="commandOpenPopup"]')).not.toBeNull();
  expect(root.ownerDocument.querySelector('#drawer img[src="/icon.svg"]')).not.toBeNull();
});
