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

import { IndexTab } from "../modules/IndexTab.js";

const indexTab = new IndexTab(location.href);
document.title = indexTab.title;

const rect = document.querySelector('#rect');

rect.setAttribute('fill', indexTab.colorCode);
rect.style.mask = `url(${indexTab.iconUrl}) center / contain no-repeat`;

browser.tabs.getCurrent().then(async (tabObj) => {
  const tabId = tabObj.id;
  const imageUrl = await browser.tabs.captureTab(tabId, {
    scale: 1,
    rect: {
      x: 0,
      y: 0,
      width: 256,
      height: 256,
    }
  });
  document.querySelector(`link[rel="icon"]`).href = imageUrl;
});

