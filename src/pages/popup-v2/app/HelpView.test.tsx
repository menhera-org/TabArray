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

import { render } from '../../../test/render';
import { Drawer } from '../../../frontend/frame/Drawer';
import { HelpView } from './HelpView';

const settings = { firstPartyIsolate: true, languageOverrides: false, uaOverrides: true, perContainerProxy: false };

test('HelpView shows the settings and reports changes and "get started"', () => {
  const onChange = vi.fn();
  const onGetStarted = vi.fn();
  const { container: root, click } = render(
    <HelpView settings={settings} onChange={onChange} onGetStarted={onGetStarted} />
  );
  const boxes = [...root.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
  expect(boxes.map((b) => b.checked)).toEqual([true, false, true, false]);
  expect(root.querySelector('label[for="input-featureUaOverrides"]')?.textContent).toBe('featureUaOverrides');
  click(boxes[1] ?? null);
  expect(onChange).toHaveBeenCalledWith('languageOverrides', true);
  click(boxes[0] ?? null);
  expect(onChange).toHaveBeenCalledWith('firstPartyIsolate', false);
  click(root.querySelector('button'));
  expect(onGetStarted).toHaveBeenCalled();
  expect(root.querySelector('img[src="/icon.svg"]')).not.toBeNull();
});

test('Drawer hides itself when closed and closes from its button or the scrim', () => {
  const onClose = vi.fn();
  const {
    container: root,
    click,
    rerender,
  } = render(
    <Drawer open={false} heading="Help" onClose={onClose}>
      content
    </Drawer>
  );
  const drawer = root.querySelector('#drawer') as HTMLElement;
  expect(drawer.hidden).toBe(true);
  rerender(
    <Drawer open={true} heading="Help" onClose={onClose}>
      content
    </Drawer>
  );
  expect(drawer.hidden).toBe(false);
  click(root.querySelector('[data-drawer-close]'));
  click(drawer.firstElementChild);
  expect(onClose).toHaveBeenCalledTimes(2);
});
