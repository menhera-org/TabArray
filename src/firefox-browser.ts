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

/*
  The builds and the tests resolve 'webextension-polyfill' to this module. The polyfill adapts Chrome's
  callback-based chrome.* API; Firefox has the promise-based browser.* API itself, which is all this
  extension uses. Its type definitions (@types/webextension-polyfill) are still used.
*/

import type { Browser } from 'webextension-polyfill';

const browser = (globalThis as unknown as { browser: Browser }).browser;

export default browser;
