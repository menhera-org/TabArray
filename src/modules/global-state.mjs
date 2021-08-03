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

browser.runtime.getBackgroundPage().then(async (background) => {
  if (!background || !background.console) {
    console.error('Failed to fetch the Window object of the background page');
    return;
  }
  if (background == window) {
    // this is background page; load only once
    await import('../background-state.mjs');
  }
  const {TabArray} = background;
}).catch((e) => {
  console.error(e);
});