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
import { expect, test, vi } from 'vitest';

import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';
import { TabGroupService } from '../../lib/tabGroups/TabGroupService';

import { container } from '../../test/fixtures';
import { render } from '../../test/render';
import { CookiesApp } from './CookiesApp';

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

test('Clear Cookies asks first, and clears only after OK', async () => {
  vi.spyOn(DisplayedContainerService.getInstance(), 'getDisplayedContainers').mockResolvedValue([
    container('firefox-container-1', 'Work'),
  ]);
  const remove = vi.spyOn(TabGroupService.getInstance(), 'removeBrowsingDataForTabGroupId').mockResolvedValue();
  const { container: root, click } = render(<CookiesApp />);
  await settle();
  const dialogButton = (label: string) =>
    [...document.querySelectorAll('dialog button')].find((b) => b.textContent == label) ?? null;

  click(root.querySelector('#buttonContainerClearCookie'));
  expect(document.querySelector('dialog h2')?.textContent).toBe('confirmContainerClearCookie(Work)');
  click(dialogButton('buttonCancel'));
  await settle();
  expect(remove).not.toHaveBeenCalled();
  expect(document.querySelector('dialog')).toBeNull();

  click(root.querySelector('#buttonContainerClearCookie'));
  click(dialogButton('buttonOk'));
  await settle();
  expect(remove).toHaveBeenCalledWith('firefox-container-1');
});
