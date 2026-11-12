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

import { BrowserStateDao } from '../../../lib/states/BrowserStateDao';

import { render } from '../../../test/render';
import { browserState, containerDao, tabDao } from '../../../test/fixtures';
import { App } from './App';

const work = 'firefox-container-1';
const state = browserState({
  currentWindowId: 1,
  windowIds: [1],
  displayedContainers: [containerDao(work, 'Work')],
  supergroups: { 'tabarray-supergroup-0': { supergroupId: 0, name: '', members: [work] } },
  tabs: { 1: tabDao(1, { cookieStoreId: work }) },
  tabIdsByContainer: { [work]: [1] },
  tabIdsBySite: { 'example.com': [1] },
  windows: {
    1: {
      id: 1,
      isPrivate: false,
      tabs: { 1: tabDao(1, { cookieStoreId: work }) },
      activeTabIds: [1],
      pinnedTabIds: [],
      activeContainers: [work],
      unpinnedTabIdsByContainer: { [work]: [1] },
    },
  },
});
const source = { subscribe: () => () => {}, getSnapshot: (): BrowserStateDao | null => state };

const shownScreen = (root: HTMLElement) => root.querySelector('[data-screen]:not([hidden])')?.id;
const heading = (root: HTMLElement) => root.querySelector('h1')?.textContent;
const selectedTarget = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-target-id]')]
    .find((b) => b.className.includes('selected'))
    ?.getAttribute('data-target-id');

/** Lets the app's startup effects (settings, shortcuts) finish inside act(). */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

test('switches screens from the bottom navigation and goes back from details', async () => {
  const { container: root, click } = render(<App state={source} isPopup={true} />);
  await settle();
  expect(shownScreen(root)).toBe('fragment-windows');
  expect(heading(root)).toBe('windowsN(1)');

  click(root.querySelector('[data-target-id="fragment-containers"]'));
  expect(shownScreen(root)).toBe('fragment-containers');
  expect(heading(root)).toBe('menuItemMain (1)');

  click(root.querySelector('#fragment-containers [data-popup-focusable]'));
  expect(shownScreen(root)).toBe('fragment-container-details');
  expect(heading(root)).toBe('Work');
  // A detail screen keeps its parent selected and offers a way back instead of help.
  expect(selectedTarget(root)).toBe('fragment-containers');
  expect(root.querySelector('[title="menuItemHelp"]')).toBeNull();
  click(root.querySelector('h1')?.parentElement?.parentElement?.querySelector('button') ?? null);
  expect(shownScreen(root)).toBe('fragment-containers');

  click(root.querySelector('[data-target-id="fragment-sites"]'));
  click(root.querySelector('#fragment-sites [data-popup-focusable]'));
  expect(shownScreen(root)).toBe('fragment-site-details');
  expect(heading(root)).toBe('example.com (1)');
  expect(selectedTarget(root)).toBe('fragment-sites');
});

test('opens help on first run with first-party isolation off until applied, until "get started"', async () => {
  // The fake storage has no help.shownOnce, and the fake browser reports isolation as off.
  const { container: root, click } = render(<App state={source} isPopup={true} />);
  await settle();
  const drawer = root.ownerDocument.querySelector('#drawer') as HTMLElement;
  const button = (text: string) => [...drawer.querySelectorAll('button')].find((b) => b.textContent == text) ?? null;
  const fpi = drawer.querySelector('#input-firstPartyIsolate') as HTMLInputElement;
  expect(drawer.hidden).toBe(false);
  expect(fpi.checked).toBe(false);
  click(button('buttonApplyRecommendedSettings'));
  expect(fpi.checked).toBe(true);
  expect(button('buttonApplyRecommendedSettings')?.disabled).toBe(true);
  click(button('buttonGetStarted'));
  expect(drawer.hidden).toBe(true);
});

test('shows only the frame until the first browser state arrives', async () => {
  const empty = { subscribe: () => () => {}, getSnapshot: (): BrowserStateDao | null => null };
  const { container: root } = render(<App state={empty} isPopup={true} />);
  await settle();
  expect(root.querySelectorAll('[data-target-id]')).toHaveLength(3);
  expect(root.querySelector('[data-screen]')).toBeNull();
});
