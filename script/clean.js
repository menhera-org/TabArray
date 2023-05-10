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

/* eslint-env es2020, node */

/*
  Run with `make clean` and `npm run clean`
*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

const findAndClear = function find(startPath, filter, removeDirectory = false) {
  if (!fs.existsSync(startPath)) {
    return;
  }

  var files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if ((!stat.isDirectory() || removeDirectory) && filename.endsWith(filter)) {
      console.log('removing:', filename);
      fs.rmSync(filename, { recursive: true, force: true });
    } else if (stat.isDirectory()) {
      // recursive search
      find(filename, filter);
    }
  }
};

const findStartingAndClear = function find(startPath, filter) {
  if (!fs.existsSync(startPath)) {
    return;
  }

  var files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      // recursive search
      find(filename, filter);
    } else if (files[i].startsWith(filter)) {
      console.log('removing:', filename);
      fs.unlinkSync(filename);
    }
  }
};

const cleanEmptyFoldersRecursively = (folder) => {
  var isDir = fs.statSync(folder).isDirectory();
  if (!isDir) {
    return;
  }
  var files = fs.readdirSync(folder);
  if (files.length > 0) {
    files.forEach(function(file) {
      var fullPath = path.join(folder, file);
      cleanEmptyFoldersRecursively(fullPath);
    });

    // re-evaluate files; after deleting subfolder
    // we may have parent folder empty now
    files = fs.readdirSync(folder);
  }

  if (files.length == 0) {
    console.log("removing: ", folder);
    fs.rmdirSync(folder);
    return;
  }
};

const distDir = path.join(__dirname, '../dist');

// clean generated files and copied static files
const topLevelCleanFiles = [
  'pages',
  'css',
  'img',
  'LICENSE',
  'icon.svg',
  '.integrity.json',
  'build.json',
  'manifest.json',
  '_locales',
  'i18n-stats',
];

const topLevelCleanPaths = topLevelCleanFiles.map((file) => path.join(distDir, file));
for (const file of topLevelCleanPaths) {
  if (fs.existsSync(file)) {
    console.log('removing:', file);
    fs.rmSync(file, { recursive: true, force: true });
  }
}

// clean generated files
findAndClear(distDir, '.js');
findAndClear(distDir, '.js.map');
findAndClear(distDir, '.css.map');
findAndClear(distDir, '.js.LICENSE.txt');
findAndClear(distDir, '.html');

// clean macOS files
findStartingAndClear(distDir, '.DS_Store');
findStartingAndClear(distDir, '._');

/*
  Clean Windows files

  Thumbs.db
  ehthumbs.db
  ehthumbs_vista.db
  *.stackdump
  [Dd]esktop.ini
  $RECYCLE.BIN/
  *.cab
  *.msi
  *.msm
  *.msp
  *.lnk
*/
findAndClear(distDir, '.db');
findAndClear(distDir, '.stackdump');
findAndClear(distDir, '.ini');
findAndClear(distDir, '.cab');
findAndClear(distDir, '.msi');
findAndClear(distDir, '.msm');
findAndClear(distDir, '.msp');
findAndClear(distDir, '.lnk');
findAndClear(distDir, '$RECYCLE.BIN', true);

// clean empty folders
cleanEmptyFoldersRecursively(distDir);

// const buildsDir = path.join(__dirname, '../builds');
// fs.rmSync(buildsDir, { recursive: true, force: true });
