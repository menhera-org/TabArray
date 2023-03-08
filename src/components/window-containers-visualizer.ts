// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import browser from 'webextension-polyfill';
import { EventSink } from '../frameworks/utils';
import { BrowserStateSnapshot } from '../frameworks/tabs/BrowserStateSnapshot';

export type EditorMode = 'create' | 'edit';

export class WindowContainersVisualizerElement extends HTMLElement {
  private _activeWindowId: number | null = null;
  private _isSearching = false;

  public readonly onContainerCreated = new EventSink<string>();
  public readonly onContainerUpdated = new EventSink<string>();
  public readonly onActiveWindowChanged = new EventSink<void>();

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/window-containers-visualizer.css';
    this.shadowRoot.appendChild(styleSheet);

  }

  public setBrowserStateSnapshot(browserStateSnapshot: BrowserStateSnapshot) {
    // todo
    if (this._activeWindowId == null) {
      this._activeWindowId = browserStateSnapshot.currentWindowId;
    }
  }

  public get activeWindowId() {
    return this._activeWindowId ?? browser.windows.WINDOW_ID_NONE;
  }

  public set activeWindowId(windowId: number) {
    if (windowId != this._activeWindowId) {
      this._activeWindowId = windowId;
      this.onActiveWindowChanged.dispatch();
    }
  }

  public searchForString(searchString = '') {
    searchString = searchString.trim();
    this._isSearching = searchString.length > 0;
    // todo
  }
}

customElements.define('window-containers-visualizer', WindowContainersVisualizerElement);
