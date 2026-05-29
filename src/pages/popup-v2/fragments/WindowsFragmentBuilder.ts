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

import browser from "webextension-polyfill";

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { BrowserStateDao } from "../../../lib/states/BrowserStateDao";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";
import { CtgMenuItemElement } from "../../../components/ctg/ctg-menu-item";
import { PanelWindowsElement } from "../../../components/panel-windows";

import { PopupUtils } from "../legacy/PopupUtils";

export class WindowsFragmentBuilder extends AbstractFragmentBuilder {
  private _windowCount = 0;
  private _enabledInPrivateBrowsing = false;
  private readonly _popupUtils = new PopupUtils();

  public getFragmentId(): string {
    return 'fragment-windows';
  }

  public getLabelText(): string {
    return browser.i18n.getMessage('menuItemWindows');
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/window.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();
    const panel = new PanelWindowsElement();
    fragment.appendChild(panel);

    fragment.onActivated.addListener(() => {
      panel.focusToSearchBox();
    });
    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    const newWindowMenuItem = new CtgMenuItemElement();
    newWindowMenuItem.labelText = browser.i18n.getMessage('buttonNewWindow');
    newWindowMenuItem.iconSrc = '/img/firefox-icons/plus.svg';
    topBarElement.addMenuItem('new-window', newWindowMenuItem);

    const newNormalWindowMenuItem = new CtgMenuItemElement();
    newNormalWindowMenuItem.labelText = browser.i18n.getMessage('buttonNewWindow');
    newNormalWindowMenuItem.iconSrc = '/img/firefox-icons/plus.svg';
    newWindowMenuItem.appendChild(newNormalWindowMenuItem);

    newNormalWindowMenuItem.addEventListener('click', () => {
      this._popupUtils.openNewWindow(false);
    });

    if (this._enabledInPrivateBrowsing) {
      const newPrivateWindowMenuItem = new CtgMenuItemElement();
      newPrivateWindowMenuItem.labelText = browser.i18n.getMessage('buttonNewPrivateWindow');
      newPrivateWindowMenuItem.iconSrc = '/img/firefox-icons/private-browsing-icon.svg';
      newPrivateWindowMenuItem.iconMode = 'normal';
      newWindowMenuItem.appendChild(newPrivateWindowMenuItem);

      newPrivateWindowMenuItem.addEventListener('click', () => {
        this._popupUtils.openNewWindow(true);
      });
    }

    topBarElement.headingText = browser.i18n.getMessage('windowsN', this._windowCount.toFixed(0));
  }

  public render(browserState: BrowserStateDao) {
    const fragment = this.getFragment();
    const windowIds = browserState.windowIds;
    this._enabledInPrivateBrowsing = browserState.enabledInPrivateBrowsing;
    const windowCount = windowIds.length;
    this._windowCount = windowCount;
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }

    const panel = fragment.querySelector('panel-windows') as PanelWindowsElement;
    panel.setState(browserState);
  }

  public override getFocusableElements(): HTMLElement[] {
    const fragment = this.getFragment();
    const panel = fragment.querySelector('panel-windows') as PanelWindowsElement;
    return panel.getFocusableElements();
  }
}
