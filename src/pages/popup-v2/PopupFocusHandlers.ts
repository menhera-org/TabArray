/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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

import { PopupUtils } from './PopupUtils';
import { getFocusableElements } from './views/focus';

const utils = new PopupUtils();

/** Arrow keys move between the shown screen's rows; Enter clicks the focused one. */
export class PopupFocusHandlers {
  public readonly cancelHandler: () => void;
  public readonly okHandler: () => void;
  public readonly keyHandler: (event: KeyboardEvent) => boolean;

  public constructor() {
    this.cancelHandler = () => void 0;
    this.okHandler = () => {
      const activeElement = this.getActiveElement();
      if (!activeElement) return;
      activeElement.click();
    };
    this.keyHandler = this._keyHandler.bind(this);
  }

  public getActiveElement(): HTMLElement | null {
    return utils.getActiveElement();
  }

  public getFocasableElements(): HTMLElement[] {
    const activeScreen = document.querySelector('[data-screen]:not([hidden])');
    return activeScreen ? getFocusableElements(activeScreen) : [];
  }

  private _arrowUpHandler(): boolean {
    const activeElement = this.getActiveElement();
    const focusableElements = this.getFocasableElements();
    if (focusableElements.length < 1) return false;
    return utils.arrowUpHandler(activeElement, focusableElements);
  }

  private _arrowDownHandler(): boolean {
    const activeElement = this.getActiveElement();
    const focusableElements = this.getFocasableElements();
    if (focusableElements.length < 1) return false;
    return utils.arrowDownHandler(activeElement, focusableElements);
  }

  private _keyHandler(event: KeyboardEvent): boolean {
    if (event.key == 'ArrowUp') {
      return this._arrowUpHandler();
    } else if (event.key == 'ArrowDown') {
      return this._arrowDownHandler();
    }
    return false;
  }
}
