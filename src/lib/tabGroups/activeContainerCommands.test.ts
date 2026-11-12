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

import { afterEach, expect, test, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
// The test setup's browser is a Proxy, so wrap it rather than spread it.
vi.mock('webextension-polyfill', async (importOriginal) => {
  const original = ((await importOriginal()) as { default: Record<string | symbol, unknown> }).default;
  const tabs = new Proxy(original.tabs as object, {
    get: (target, property) => (property == 'query' ? query : Reflect.get(target, property)),
  });
  return {
    default: new Proxy(original, { get: (target, property) => (property == 'tabs' ? tabs : target[property]) }),
  };
});

import { ContainerVisibilityService } from './ContainerVisibilityService';
import { NativeTabGroupService } from './NativeTabGroupService';
import { setActiveContainerCollapsed } from './activeContainerCommands';

const groups = NativeTabGroupService.getInstance();
const visibility = ContainerVisibilityService.getInstance();
const workTab = { id: 7, windowId: 1, cookieStoreId: 'firefox-container-1', pinned: false, incognito: false };

afterEach(() => {
  vi.restoreAllMocks();
});

test("as tab groups, the active tab's group is collapsed and expanded", async () => {
  query.mockResolvedValue([workTab]);
  vi.spyOn(groups, 'isActive').mockResolvedValue(true);
  const setCollapsed = vi.spyOn(groups, 'setContainerCollapsed').mockResolvedValue(true);
  await setActiveContainerCollapsed(true);
  await setActiveContainerCollapsed(false);
  expect(setCollapsed.mock.calls).toEqual([
    [1, 'firefox-container-1', true],
    [1, 'firefox-container-1', false],
  ]);
});

test('without tab groups, the container is hidden and shown as from the popup', async () => {
  query.mockResolvedValue([workTab]);
  vi.spyOn(groups, 'isActive').mockResolvedValue(false);
  const hide = vi.spyOn(visibility, 'hideContainerOnWindow').mockResolvedValue(true);
  const show = vi.spyOn(visibility, 'showContainerOnWindow').mockResolvedValue();
  await setActiveContainerCollapsed(true);
  await setActiveContainerCollapsed(false);
  expect(hide).toHaveBeenCalledWith(1, 'firefox-container-1');
  expect(show).toHaveBeenCalledWith(1, 'firefox-container-1');
});

test('pinned tabs and tabs with no container do nothing', async () => {
  const isActive = vi.spyOn(groups, 'isActive');
  for (const tab of [
    { ...workTab, pinned: true },
    { ...workTab, cookieStoreId: 'firefox-default' },
  ]) {
    query.mockResolvedValue([tab]);
    await setActiveContainerCollapsed(true);
  }
  expect(isActive).not.toHaveBeenCalled();
});
