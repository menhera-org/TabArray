// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
*/

import browser from 'webextension-polyfill';
import {PANORAMA_PAGE} from '../defs';

export class PopupUtils {
  public getActiveElement(): HTMLElement | null {
    const activeElement = document.activeElement == document.body ? null : document.activeElement;
    if (activeElement instanceof HTMLElement) {
      return activeElement;
    }
    return null;
  }

  public arrowUpHandler(activeElement: HTMLElement | null, buttons: HTMLElement[]) {
    const index = activeElement ? buttons.indexOf(activeElement) : -1;
    if (index <= 0) {
      buttons[buttons.length - 1]?.focus();
    } else {
      buttons[index - 1]?.focus();
    }
    return true;
  }

  public arrowDownHandler(activeElement: HTMLElement | null, buttons: HTMLElement[]) {
    const index = activeElement ? buttons.indexOf(activeElement) : -1;
    if (index < 0 || index >= buttons.length - 1) {
      buttons[0]?.focus();
    } else {
      buttons[index + 1]?.focus();
    }
    return true;
  }

  private handlePopupClose(promise: Promise<unknown>) {
    promise.then(() => {
      window.close();
    }).catch((e) => {
      console.error(e);
    });
  }

  public queryElementNonNull<T extends Element>(query: string): T {
    const element = document.querySelector(query);
    if (null == element) {
      throw new Error(`Element not found: ${query}`);
    }
    return element as T;
  }

  public openPanoramaPage() {
    this.handlePopupClose(browser.tabs.create({
      active: true,
      windowId: browser.windows.WINDOW_ID_CURRENT,
      url: browser.runtime.getURL(PANORAMA_PAGE),
    }));
  }

  public openOptionsPage() {
    this.handlePopupClose(browser.runtime.openOptionsPage().then(() => {
      window.close();
    }));
  }

  public openSidebar() {
    browser.sidebarAction.open().catch((e) => {
      console.error(e);
    });
  }

  public openNewWindow(isPrivate: boolean) {
    this.handlePopupClose(browser.windows.create({
      incognito: isPrivate,
      focused: true,
    }));
  }
}
