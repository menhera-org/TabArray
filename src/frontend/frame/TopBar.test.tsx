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

import { render } from '../../test/render';
import { MenuItem } from './MenuItem';
import { ScreenTopBar, TopBar } from './TopBar';

const bar = (root: HTMLElement) => root.firstElementChild as HTMLElement;
const titles = (element: Element) => [...element.children].map((e) => e.getAttribute('title') ?? e.tagName);

describe('TopBar', () => {
  test('puts the active screen heading and items before the global items', () => {
    const { container: root } = render(
      <TopBar
        onBack={null}
        drawerButton={{ icon: '/img/firefox-icons/help.svg', label: 'menuItemHelp', onClick: () => {} }}
        spinning={false}
        isPopup={true}
      >
        <ScreenTopBar active={false} heading="Hidden screen" />
        <ScreenTopBar active={true} heading="Shown screen">
          <MenuItem icon="/a.svg" label="buttonNewWindow" iconOnly />
        </ScreenTopBar>
      </TopBar>
    );
    expect(bar(root).textContent).toContain('Shown screen');
    expect(bar(root).textContent).not.toContain('Hidden screen');
    const slot = bar(root).children[2] as HTMLElement;
    expect(titles(slot)).toEqual(['H1', 'buttonNewWindow']);
    const overflow = bar(root).lastElementChild as HTMLElement;
    expect(titles(bar(root)).slice(3)).toEqual(['panoramaGrid', 'buttonSettings', 'CTG-MENU-ITEM']);
    expect(titles(overflow)[0]).toBe('commandOpenSidebar');
  });

  test('offers "open popup" outside the popup', () => {
    const { container: root } = render(
      <TopBar
        onBack={null}
        drawerButton={{ icon: '/img/firefox-icons/help.svg', label: 'menuItemHelp', onClick: () => {} }}
        spinning={false}
        isPopup={false}
      >
        {null}
      </TopBar>
    );
    expect(titles(bar(root).lastElementChild as HTMLElement)[0]).toBe('commandOpenPopup');
  });

  test('shows help, or back on detail screens', () => {
    const onHelp = vi.fn();
    const onBack = vi.fn();
    const {
      container: root,
      click,
      rerender,
    } = render(
      <TopBar
        onBack={null}
        drawerButton={{ icon: '/img/firefox-icons/help.svg', label: 'menuItemHelp', onClick: onHelp }}
        spinning={false}
        isPopup={true}
      >
        {null}
      </TopBar>
    );
    click(root.querySelector('[title="menuItemHelp"]'));
    expect(onHelp).toHaveBeenCalled();
    rerender(
      <TopBar
        onBack={onBack}
        drawerButton={{ icon: '/img/firefox-icons/help.svg', label: 'menuItemHelp', onClick: onHelp }}
        spinning={true}
        isPopup={true}
      >
        {null}
      </TopBar>
    );
    expect(root.querySelector('[title="menuItemHelp"]')).toBeNull();
    expect(bar(root).querySelector('button')?.title).toBe('buttonBack');
    click(bar(root).querySelector('button'));
    expect(onBack).toHaveBeenCalled();
  });
});
