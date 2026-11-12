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

import '../../frontend/documentLocale';
import browser from 'webextension-polyfill';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { ExternalServiceProvider } from '../../lib/ExternalServiceProvider';
import { BrowserStateStore } from '../../lib/states/BrowserStateStore';
import { followThemeColors } from '../../frontend/themeColors';

import { App } from './app/App';
import { throttle } from './app/throttledState';
import { pushKeyHandlers } from './keyHandlers';
import { PopupFocusHandlers } from './PopupFocusHandlers';

const searchParams = new URLSearchParams(window.location.search);
const isPopup = searchParams.get('popup') == '1';
if (isPopup) {
  document.body.classList.add('popup');
  if (searchParams.get('large') == '1') {
    document.body.classList.add('popup-large');
  }
}

ExternalServiceProvider.getInstance();
followThemeColors(isPopup ? 'popup' : 'sidebar');
document.title = browser.i18n.getMessage('browserActionPopupTitle');

const popupFocusHandlers = new PopupFocusHandlers();
pushKeyHandlers(popupFocusHandlers.okHandler, popupFocusHandlers.cancelHandler, popupFocusHandlers.keyHandler);

// Tab events come in bursts; render at most every 200 ms.
const state = throttle(new BrowserStateStore(), 200);

createRoot(document.getElementById('app') as HTMLElement).render(createElement(App, { state, isPopup }));
