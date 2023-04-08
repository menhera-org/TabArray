// vim: ts=2 sw=2 et ai
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

const defaultIconUrl = '/img/material-icons/category.svg';
const params = new URLSearchParams(window.location.hash.slice(1));
const title = params.get('t') ?? '';
const iconUrl = params.get('iu') ?? defaultIconUrl;

document.addEventListener('DOMContentLoaded', async () => {
  document.title = title;
  const iconElement = document.querySelector<HTMLLinkElement>(`link[rel="icon"]`);
  if (!iconElement) return;
  const iconUrlObject = new URL(iconUrl, window.location.href);
  const color = iconUrlObject.hash.slice(1);
  iconUrlObject.hash = '';
  const res = await fetch(iconUrlObject.href);
  const text = await res.text();
  const svgDocument = new DOMParser().parseFromString(text, 'image/svg+xml');
  svgDocument.querySelector('style')?.remove();
  const groups = svgDocument.querySelectorAll('g');
  for (const group of groups) {
    if (group.id != color) {
      group.remove();
    }
  }
  const source = new XMLSerializer().serializeToString(svgDocument);
  iconElement.href = `data:image/svg+xml,${encodeURIComponent(source)}`;
});
