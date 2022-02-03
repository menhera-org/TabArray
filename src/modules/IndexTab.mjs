// vim: ts=2 sw=2 et ai
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

const indexPageUrl = browser.runtime.getURL('/index/index.html');
const defaultIconUrl = browser.runtime.getURL('/icon.svg');

export class IndexTab {
  constructor(aUrl) {
    const url = new URL(aUrl);
    const hash = url.hash.slice(1);
    url.hash = '';
    if (url.href != indexPageUrl) {
      throw new TypeError('Not an IndexTab');
    }
    const params = new URLSearchParams(hash);
    this.iconUrl = params.i || defaultIconUrl;
    this.title = params.t || '';
  }
}
