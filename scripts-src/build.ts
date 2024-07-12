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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as child_process from 'child_process';

import zip from 'deterministic-zip-ng';
import { ed25519 } from '@noble/curves/ed25519';
import { glob } from 'glob';
import { DeterministicJSON } from '@menhera/deterministic-json';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const importJson = (path: string): any => {
  const contents = fs.readFileSync(path, 'utf8');
  return JSON.parse(contents);
};

const manifest = importJson(__dirname + '/../src/manifest.json');
const releaseJson = importJson(__dirname + '/../src/release.json');
const packageJson = importJson(__dirname + '/../package.json');

const baseVersion = String(packageJson.version);
const isDevelopmentVersion = !!releaseJson.isDevelopmentVersion;
const basePatchVersion = releaseJson.patchVersion >>> 0;
if (basePatchVersion > 99) {
  throw new Error(`Invalid patch version: ${basePatchVersion}`);
}

const patchVersion = isDevelopmentVersion ? 100 + basePatchVersion : 200 + basePatchVersion;
const version = `${baseVersion}.${patchVersion}`;
manifest.version = version;

const distDir = __dirname + '/../dist';
fs.mkdirSync(distDir, { recursive: true });

const zipDirectoryContents = async (directory: string, outputPath: string) => {
  return new Promise<void>((resolve, reject) => {
    zip(directory, outputPath, {includes: ['./**/{*,.??*}'], excludes: [], cwd: directory}, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const runCommand = async (command: string, args: string[]): Promise<string> => {
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

/**
 * Sort paths.
 */
const sortPaths = (paths: string[]) => {
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
      const aPart = aParts[i] as string;
      const bPart = bParts[i] as string;
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

const getIntegrityListing = async (): Promise<Record<string, string>> => {
  const files = sortPaths(await getDistFilePaths());
  const listing: Record<string, string> = {};
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
  const version = String(manifest.version);

  const info = {
    isDevelopmentVersion,
    commit,
    untracked,
    buildDate: new Date(buildDate).toISOString(),
  };
  const infoPath = __dirname + '/../dist/build.json';
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));

  const manifestJson = DeterministicJSON.stringify(manifest, null, 2);
  const manifestPath = __dirname + '/../dist/manifest.json';
  fs.writeFileSync(manifestPath, manifestJson);

  const integrity = await getIntegrityHash();
  const integrityPath = __dirname + '/../dist/.integrity.json';
  fs.writeFileSync(integrityPath, JSON.stringify(integrity, null, 2));

  const lintResult = await runCommand('npx', ['addons-linter', './dist/']);
  console.log(lintResult);

  const buildVersionDir = __dirname + `/../builds/${version}`;
  const destinationFilename = buildVersionDir + '/' + filename;

  const buildMetadataDir = __dirname + '/../build-metadata/' + version;

  await fs.promises.mkdir(buildVersionDir, { recursive: true });
  await fs.promises.mkdir(buildMetadataDir, { recursive: true });
  await zipDirectoryContents(__dirname + '/../dist', destinationFilename);

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

  const signingKey = process.env.ED25519_IDENTITY;
  if (signingKey && !untracked) {
    console.log('Generating signature for %s (%s)', filename, hash);
    const metadataBuffer = Buffer.from(metadataJson, 'utf8');
    const privKey = Buffer.from(signingKey, 'hex');
    const pubKey = ed25519.getPublicKey(privKey);
    const signature = ed25519.sign(metadataBuffer, privKey);
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
