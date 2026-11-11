/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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
  Run with `npm run package-source`.
  Writes a source tarball of HEAD with .menhera_vcs_info.json at its root,
  from which `npm ci && npm run build` reproduces the same extension.
*/

import * as fs from 'node:fs';

import { ROOT_DIR, VCS_INFO_FILENAME, getBuildVersion, getGitVcsInfo, runCommand } from './vcs.js';

const main = async () => {
  const version = getBuildVersion();
  const vcsInfo = await getGitVcsInfo();
  if (vcsInfo.git.dirty) {
    // git archive packs HEAD only, so uncommitted changes would be silently dropped.
    throw new Error('Working tree has uncommitted changes. Commit or stash them first.');
  }
  const { sha1, commit_timestamp } = vcsInfo.git;
  const vcsInfoJson = JSON.stringify(vcsInfo, null, 2) + '\n';

  const outDir = `${ROOT_DIR}/builds/${version}`;
  const outPath = `${outDir}/ctg-${version}-${commit_timestamp}-${sha1.slice(0, 7)}-source.tar.gz`;
  await fs.promises.mkdir(outDir, { recursive: true });

  const prefix = `ctg-${version}/`;
  // --prefix does not apply to --add-virtual-file, so the path carries it.
  await runCommand('git', [
    'archive',
    '--format=tar.gz',
    `--prefix=${prefix}`,
    `--add-virtual-file=${prefix}${VCS_INFO_FILENAME}:${vcsInfoJson}`,
    '-o',
    outPath,
    sha1,
  ]);
  console.log(`Wrote ${await fs.promises.realpath(outPath)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
