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

import { IndexTab } from "../modules/IndexTab.mjs";

const canvas = document.querySelector('#icon');
const ctx = canvas.getContext('2d');

const indexTab = new IndexTab(location.href);
document.title = indexTab.title;

const svgSource = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
<rect x='0' y='0' width='256' height='256' fill='${indexTab.colorCode}' style='mask-image:url(${indexTab.iconUrl})'/>
</svg>`;
const blob = new Blob([svgSource], {
  type: 'image/svg+xml',
});
const objectUrl = URL.createObjectURL(blob)
document.querySelector(`link[rel="icon"]`).href = objectUrl;
