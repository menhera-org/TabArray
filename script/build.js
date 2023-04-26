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
  Run with `make` and `npm run build`
*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const child_process = require('child_process');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const zip = require('deterministic-zip-ng');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('../dist/manifest.json');

/**
 *
 * @param {string} directory
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
const zipDirectoryContents = async (directory, outputPath) => {
  return new Promise((resolve, reject) => {
    zip(directory, outputPath, {includes: ['./**'], cwd: directory}, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Runs command asynchronously
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<string>}
 */
const runCommand = async (command, args) => {
  return new Promise((resolve, reject) => {
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

const startTime = Date.now();
runCommand('git', ['rev-parse', 'HEAD']).then(async (stdout) => {
  const hash = stdout.trim();
  let untracked = false;
  try {
    await runCommand('git', ['diff-index', '--quiet', 'HEAD', '--']);
  } catch (e) {
    untracked = true;
  }
  let date = new Date();
  if (!untracked) {
    try {
      const timeString = await runCommand('git', ['show', '-s', '--format=%ct', 'HEAD']);
      const time = parseInt(timeString.trim(), 10);
      if (isNaN(time)) {
        throw new Error('Invalid time');
      }
      date = new Date(time * 1000);
    } catch (e) {
      console.warn(e);
    }
  }
  const shortHash = hash.slice(0, 7);
  const time = Math.trunc(date.getTime() / 1000);
  const buildId = untracked ? `${shortHash}_untracked` : shortHash;
  const version = manifest.version;
  const filename = `ctg-${version}-${time}-${buildId}.xpi`;
  return { filename, commit: hash, untracked, buildDate: date.getTime() };
}).catch((error) => {
  console.error(error);
  const date = new Date();
  const time = Math.trunc(date.getTime() / 1000);
  const version = manifest.version;
  return { filename: `ctg-${version}-${time}-unknown.xpi`, commit: '', untracked: true, buildDate: date.getTime() };
}).then(async ({filename, commit, untracked, buildDate}) => {
  console.log(`Building ${filename}`);
  const info = {
    commit,
    untracked,
    buildDate: new Date(buildDate).toISOString(),
  };
  const infoPath = __dirname + '/../dist/build.json';
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
  const lintResult = await runCommand('npx', ['web-ext', 'lint', '--source-dir', './dist/', '--warnings-as-errors']);
  console.log(lintResult);

  const buildDir = __dirname + '/../builds';
  const destinationFilename = __dirname + '/../builds/' + filename;

  await fs.promises.mkdir(buildDir, { recursive: true });
  await zipDirectoryContents(__dirname + '/../dist', destinationFilename);

  const realpath = await fs.promises.realpath(destinationFilename);
  return realpath;
}).then((filename) => {
  const duration = Date.now() - startTime;
  console.log(`Built ${filename} in ${duration}ms`);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
