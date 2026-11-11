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

import browser from 'webextension-polyfill';
import { type ReactNode } from 'react';

// Defines the element, so that React sets the props below as its properties.
import '../../components/ctg/ctg-menu-item';
import { CtgMenuItemDisplayStyle, CtgMenuItemIconMode } from '../../components/ctg/ctg-menu-item';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // React 19 sets these as properties of the custom element, and `onclick` as a listener on it.
      'ctg-menu-item': {
        className?: string;
        hidden?: boolean;
        displayStyle: CtgMenuItemDisplayStyle;
        iconSrc?: string;
        iconMode?: CtgMenuItemIconMode;
        labelText?: string;
        onclick?: () => void;
        children?: ReactNode;
      };
    }
  }
}

type MenuItemProps = {
  className?: string;
  /** Without one, the element's default icon. */
  icon?: string;
  /** Draw the icon as it is, not as a mask in the text color. */
  iconInColor?: boolean;
  /** i18n message name of the label, which is also the tooltip. */
  label?: string;
  /** Without the label, as an icon button. */
  iconOnly?: boolean;
  hidden?: boolean;
  onClick?: () => void;
  /** Menu items of a menu that this item opens. */
  children?: ReactNode;
};

/**
 * A <ctg-menu-item>. It stops click events from bubbling, so React's delegated onClick
 * would never see them; the listener goes on the element itself.
 */
export const MenuItem = ({
  className,
  icon,
  iconInColor = false,
  label,
  iconOnly = false,
  hidden = false,
  onClick,
  children,
}: MenuItemProps) => (
  <ctg-menu-item
    // Only set what is given: the element's setters take undefined literally.
    {...(className != null ? { className } : {})}
    {...(icon != null ? { iconSrc: icon } : {})}
    {...(iconInColor ? { iconMode: 'normal' as const } : {})}
    {...(label != null ? { labelText: browser.i18n.getMessage(label) } : {})}
    {...(onClick != null ? { onclick: onClick } : {})}
    hidden={hidden}
    displayStyle={iconOnly ? 'icon' : 'normal'}
  >
    {children}
  </ctg-menu-item>
);
