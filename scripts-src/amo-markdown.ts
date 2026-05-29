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

// This file generates AMO-style HTML from Markdown.

/* eslint-env es2020, node */

import fs from 'fs';

import markdownit from 'markdown-it';
const md = markdownit({
  html: true,
  linkify: true,
  typographer: true
});

const input = process.argv[2] ?? 'README.md';
const source = fs.readFileSync(input, 'utf8');

const result = md.render(source);
const replaced = result.replaceAll('<p>', '\n')
  .replaceAll('</p>', '\n')
  .replace(/<h([1-6])>/g, '\n<strong>')
  .replace(/<\/h([1-6])>/g, '</strong>\n')
  .replaceAll('\n\n\n', '\n\n');

fs.writeFileSync(process.argv[3] ?? input.replace(/\.md$/i, '.html'), replaced);
