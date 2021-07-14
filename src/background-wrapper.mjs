// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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

const views = browser.extension.getViews();
let loaded = false;
for (const view of views) {
  if (window == view) continue;
  if (view.location.pathname == location.pathname) {
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.log('Loading the background script.');
  import('/background.mjs').catch((e) => console.error(e));
} else {
  console.warn('Background script already loaded, aborting.');
}
