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
  Display a nice directory listing for extension directories.
*/

// WebExtensions API is not available in this context.

import { PackageDirectory } from "../../../lib/package/PackageDirectory";
import { DirectoryListingParser } from "../../../lib/package/DirectoryListingParser";

(async () => {
  const pre = document.querySelector('pre');
  if (!pre) return;
  const listingText = pre.textContent ?? '';

  const parser = new DirectoryListingParser();
  let directory: PackageDirectory;
  try {
    directory = parser.parse(listingText);
  } catch (e) {
    return;
  }
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  table.appendChild(thead);
  table.appendChild(tbody);
  const th1 = document.createElement('th');
  th1.textContent = 'filename';
  thead.appendChild(th1);
  const th2 = document.createElement('th');
  th2.textContent = 'content-length';
  thead.appendChild(th2);
  const th3 = document.createElement('th');
  th3.textContent = 'file-type';
  thead.appendChild(th3);

  table.style.marginInline = 'auto';
  table.style.maxInlineSize = '50%';
  table.style.marginBlock = '1em';
  table.style.borderSpacing = '.5em';

  if (location.pathname != '/') {
    directory.entries.unshift({
      type: 'directory',
      filename: '..',
      fullPath: '../',
      fileSize: 0,
    });
  }

  for (const entry of directory.entries) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    tr.appendChild(td1);
    const link = document.createElement('a');
    td1.appendChild(link);
    link.href = entry.fullPath;
    link.style.color = 'var(--in-content-link-color)';
    link.style.textDecoration = 'none';
    const icon = document.createElement('span');
    icon.style.backgroundColor = 'var(--text-color)';
    const iconUrl = entry.type === 'directory' ? '/img/firefox-icons/folder.svg' : '/img/firefox-icons/page-vertical.svg';
    icon.style.mask = `url(${iconUrl}) no-repeat center / contain`;
    icon.style.display = 'inline-block';
    icon.style.width = '1em';
    icon.style.height = '1em';
    icon.style.verticalAlign = 'middle';
    icon.style.marginInlineEnd = '0.5em';
    link.appendChild(icon);
    link.append(entry.filename);
    const td2 = document.createElement('td');
    td2.textContent = entry.fileSize.toString();
    tr.appendChild(td2);
    const td3 = document.createElement('td');
    td3.textContent = entry.type.toUpperCase();
    tr.appendChild(td3);
    tbody.appendChild(tr);
  }

  pre.remove();

  document.title = location.pathname;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/css/theme.css';
  document.head.appendChild(stylesheet);

  document.body.style.fontFamily = 'system-ui';
  document.body.appendChild(table);
})().catch((e) => {
  console.warn(e);
});
