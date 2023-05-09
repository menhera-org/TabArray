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
const crypto = require('crypto');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const child_process = require('child_process');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const zip = require('deterministic-zip-ng');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { glob } = require("glob");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('../src/manifest.json');

const edPromise = import('@noble/ed25519');

/**
 *
 * @param {string} directory
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
const zipDirectoryContents = async (directory, outputPath) => {
  return new Promise((resolve, reject) => {
    zip(directory, outputPath, {includes: ['./**/{*,.??*}'], excludes: [], cwd: directory}, (err) => {
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

/**
 * Sort paths.
 * @param {string[]} paths
 * @returns {string[]}
 */
const sortPaths = (paths) => {
  paths.forEach((path) => {
    if (!path.startsWith('/')) {
      throw new Error(`Invalid path: ${path}`);
    }
  });
  return [... paths].sort((a, b) => {
    const aParts = a.split('/').slice(1).filter(part => part != '');
    const bParts = b.split('/').slice(1).filter(part => part != '');
    const minLength = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < minLength; i++) {
      const aPart = aParts[i];
      const bPart = bParts[i];
      if (aPart < bPart) {
        return -1;
      } else if (aPart > bPart) {
        return 1;
      }
    }
    return aParts.length - bParts.length;
  });
};

const DIST_DIR = __dirname + '/../dist';
const getDistFilePaths = async () => {
  let paths = await glob('**/*', { cwd: DIST_DIR, nodir: true, dot: true, realpath: false });
  paths = paths.map((path) => `/${path}`);
  paths = paths.filter((path) => path != '/.integrity.json');
  return paths;
};

/**
 *
 * @returns {Promise<Record<string, string>>}
 */
const getIntegrityListing = async () => {
  const files = sortPaths(await getDistFilePaths());
  const listing = {};
  for (const path of files) {
    const fullPath = DIST_DIR + path;
    const buff = fs.readFileSync(fullPath);
    const hash = crypto.createHash("sha256").update(buff).digest("hex");
    listing[path] = hash;
  }
  return listing;
};

const getIntegrityHash = async () => {
  const listing = await getIntegrityListing();
  const json = JSON.stringify(listing);
  const buffer = Buffer.from(json, 'utf8');
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return {
    version: 1,
    hash,
    files: listing,
  };
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

  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestPath = __dirname + '/../dist/manifest.json';
  fs.writeFileSync(manifestPath, manifestJson);

  const integrity = await getIntegrityHash();
  const integrityPath = __dirname + '/../dist/.integrity.json';
  fs.writeFileSync(integrityPath, JSON.stringify(integrity, null, 2));

  const lintResult = await runCommand('npx', ['addons-linter', './dist/']);
  console.log(lintResult);

  const buildDir = __dirname + '/../builds';
  const destinationFilename = __dirname + '/../builds/' + filename;

  const buildMetadataDir = __dirname + '/../build-metadata';

  await fs.promises.mkdir(buildDir, { recursive: true });
  await fs.promises.mkdir(buildMetadataDir, { recursive: true });
  await zipDirectoryContents(__dirname + '/../dist', destinationFilename);

  const version = String(manifest.version);
  const hash = integrity.hash;
  const metadata = {
    version,
    commit,
    untracked,
    buildDate,
    hash,
  };
  const metadataJson = JSON.stringify(metadata); // no pretty print
  const buildMetadataFilename = `${buildMetadataDir}/${hash}.json`;
  fs.writeFileSync(buildMetadataFilename, metadataJson);

  const ed = await edPromise;
  const signingKey = process.env.ED25519_IDENTITY;
  if (signingKey && !untracked) {
    console.log('Generating signature for %s (%s)', filename, hash);
    const metadataBuffer = Buffer.from(metadataJson, 'utf8');
    const privKey = Buffer.from(signingKey, 'hex');
    const pubKey = await ed.getPublicKeyAsync(privKey);
    const signature = await ed.signAsync(metadataBuffer, privKey);
    const signatureBuffer = Buffer.from(signature);
    const pubKeyBuffer = Buffer.from(pubKey);
    const metadataBase64 = metadataBuffer.toString('base64');
    const signatureBase64 = signatureBuffer.toString('base64');
    const pubKeyBase64 = pubKeyBuffer.toString('base64');

    const signedMetadata = {
      metadata: metadataBase64,
      signature: signatureBase64,
      publicKey: pubKeyBase64,
    };
    const signedMetadataJson = JSON.stringify(signedMetadata, null, 2);
    const signedMetadataFilename = `${buildMetadataDir}/${hash}.signed.json`;
    fs.writeFileSync(signedMetadataFilename, signedMetadataJson);
  }

  const realpath = await fs.promises.realpath(destinationFilename);
  return realpath;
}).then((filename) => {
  const duration = Date.now() - startTime;
  console.log(`Built ${filename} in ${duration}ms`);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
