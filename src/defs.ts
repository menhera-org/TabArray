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

/*
  locations. Always use this value so that changing the location of pages
  is easier.
*/
export const ADDON_PAGE = 'https://addons.mozilla.org/firefox/addon/container-tab-groups/';
export const PRIVACY_POLICY_PAGE = 'https://menhera-org.github.io/TabArray/PRIVACY_POLICY.html';
export const GITHUB_PAGE = 'https://github.com/menhera-org/TabArray';
export const PANORAMA_PAGE = '/pages/panorama/panorama.html';
export const CONFIRM_PAGE = '/pages/navigation/confirm.html';
export const COOKIES_PAGE = '/pages/cookies/cookies.html';
export const POPUP_PAGE = '/pages/popup-v2/popup-v2.html';
export const INDEX_TAB_PAGE = '/pages/index/index-tab.html';
export const DEBUGGING_PAGE = '/pages/debugging/debugging.html';
export const GITHUB_TREE_LINK_BASE = 'https://github.com/menhera-org/TabArray/tree/';

/* Content scripts */
// content scripts for extension pages
export const CONTENT_EXTENSION_DIRECTORY_LISTING = '/content/ext/directory-listing/directory-listing.js';

// Public key for verifying signed messages from the official CTG developers (Continuous Integration key)
export const CTG_OFFICIAL_ED25519_SIGNING_KEY = '2896306f0d985fdd2febcd930b0733c7c86afcd705652f4a4aadd513235d7867';

export const CTG_OFFCIAL_SIGNATURE_URL = 'https://menhera-org.github.io/ctg-releases/build-metadata/$1.signed.json';

export enum NotificationChannelId {
  NEW_VERSION_AVAILABLE = 'new-version-available',
}
