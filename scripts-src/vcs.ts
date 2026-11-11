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

import * as fs from 'node:fs';
import * as child_process from 'node:child_process';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = dirname(fileURLToPath(import.meta.url)) + '/..';

/** Written at the root of source tarballs, like Cargo's `.cargo_vcs_info.json`. */
export const VCS_INFO_FILENAME = '.menhera_vcs_info.json';

/**
 * Cargo's `.cargo_vcs_info.json` layout, plus `commit_timestamp`
 * (the commit's committer date in Unix seconds, as git and GitHub record it),
 * so that builds without `.git` get the same build date.
 */
export type VcsInfo = {
  git: {
    sha1: string;
    commit_timestamp: number;
    dirty?: boolean;
  };
  path_in_vcs: string;
};

const importJson = (path: string): any => {
  const contents = fs.readFileSync(path, 'utf8');
  return JSON.parse(contents);
};

export const runCommand = async (command: string, args: string[]): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    child_process.execFile(command, args, (error, stdout, stderr) => {
      const stderrTrimmed = stderr.trim();
      if (stderrTrimmed) {
        console.warn(stderrTrimmed);
      }
      if (error) {
        reject(error);
      }
      resolve(stdout);
    });
  });
};

/** `<package.json version>.<1xx|2xx>` from src/release.json. */
export const getBuildVersion = (): string => {
  const releaseJson = importJson(ROOT_DIR + '/src/release.json');
  const packageJson = importJson(ROOT_DIR + '/package.json');

  const baseVersion = String(packageJson.version);
  const isDevelopmentVersion = !!releaseJson.isDevelopmentVersion;
  const basePatchVersion = releaseJson.patchVersion >>> 0;
  if (basePatchVersion > 99) {
    throw new Error(`Invalid patch version: ${basePatchVersion}`);
  }

  const patchVersion = isDevelopmentVersion ? 100 + basePatchVersion : 200 + basePatchVersion;
  return `${baseVersion}.${patchVersion}`;
};

export const getGitVcsInfo = async (): Promise<VcsInfo> => {
  const sha1 = (await runCommand('git', ['rev-parse', 'HEAD'])).trim();
  let dirty = false;
  try {
    await runCommand('git', ['diff-index', '--quiet', 'HEAD', '--']);
  } catch (e) {
    dirty = true;
  }
  const commitTimestamp = parseInt((await runCommand('git', ['show', '-s', '--format=%ct', 'HEAD'])).trim(), 10);
  if (isNaN(commitTimestamp)) {
    throw new Error('Invalid commit time');
  }
  const git: VcsInfo['git'] = { sha1, commit_timestamp: commitTimestamp };
  if (dirty) {
    // Like Cargo: the key is present only when dirty.
    git.dirty = true;
  }
  return { git, path_in_vcs: '' };
};

/** The tarball's recorded info wins, so an extracted tarball inside another repository is not misread. */
export const getVcsInfo = async (): Promise<VcsInfo> => {
  const path = ROOT_DIR + '/' + VCS_INFO_FILENAME;
  if (fs.existsSync(path)) {
    const info = importJson(path) as VcsInfo;
    if (!/^[0-9a-f]{40}$/.test(String(info?.git?.sha1)) || !Number.isSafeInteger(info.git.commit_timestamp)) {
      throw new Error(`Invalid ${VCS_INFO_FILENAME}`);
    }
    return info;
  }
  return getGitVcsInfo();
};
