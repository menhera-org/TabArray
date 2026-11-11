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
  Run with `npm run smoke -- [options]` after `npm run build`.
  Opens an extension page from dist/ in headless Firefox inside Docker (no network)
  and saves a screenshot, the page's DOM and Firefox's console output.

  Options:
    --out DIR          Output directory (default: builds/smoke)
    --page PATH        Extension page (default: pages/popup-v2/popup-v2.html?popup=1)
    --fragment ID      Close the help drawer and click this popup screen's bottom navigation
                       button (fragment-windows, fragment-containers or fragment-sites)
    --seed             Create a few containers, each with one tab, before the screenshot
    --eval JS          Run JS in the page after --fragment, e.g. to click something. It is sent
                       as part of the WebDriver script, not evaluated by the page, and runs 100 ms
                       after the screen switch so that the new screen is on the page.
    --size WxH         Window size (default: 400x600)
    --image IMAGE      Docker image with Firefox and geckodriver (default: $FIREFOX_SMOKE_IMAGE
                       or selenium/standalone-firefox:latest)
*/

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';

import { ROOT_DIR, runCommand } from './vcs.js';

const EXTENSION_ID = 'tab-array@menhera.org';
const EXTENSION_UUID = '11111111-2222-3333-4444-555555555555';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: path.join(ROOT_DIR, 'builds', 'smoke') },
    page: { type: 'string', default: 'pages/popup-v2/popup-v2.html?popup=1' },
    fragment: { type: 'string' },
    seed: { type: 'boolean', default: false },
    eval: { type: 'string' },
    size: { type: 'string', default: '400x600' },
    image: { type: 'string', default: process.env.FIREFOX_SMOKE_IMAGE || 'selenium/standalone-firefox:latest' },
  },
});

const main = async () => {
  const [width, height] = String(values.size)
    .split('x')
    .map((n) => parseInt(n, 10));
  if (!width || !height) {
    throw new Error(`Invalid --size: ${values.size}`);
  }
  const distDir = path.join(ROOT_DIR, 'dist');
  if (!fs.existsSync(path.join(distDir, 'manifest.json'))) {
    throw new Error('dist/manifest.json not found. Run `npm run build` first.');
  }

  const outDir = path.resolve(String(values.out));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  // The container runs as a different user and writes its results here.
  fs.chmodSync(outDir, 0o777);

  const writeJson = (name: string, value: unknown) => {
    fs.writeFileSync(path.join(outDir, name), JSON.stringify(value));
  };
  writeJson('session.json', {
    capabilities: {
      alwaysMatch: {
        'moz:firefoxOptions': {
          args: ['-headless', `--window-size=${width},${height}`],
          prefs: {
            'extensions.webextensions.uuids': JSON.stringify({ [EXTENSION_ID]: EXTENSION_UUID }),
            'devtools.console.stdout.content': true,
            'devtools.console.stdout.chrome': true,
          },
        },
      },
    },
  });
  writeJson('navigate.json', {
    script:
      'gBrowser.loadURI(Services.io.newURI(arguments[0]), ' +
      '{ triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });',
    args: [`moz-extension://${EXTENSION_UUID}/${values.page}`],
  });
  // Runs in the extension page, so it can use the WebExtension APIs.
  writeJson('setup.json', {
    script: `const [seed, done] = arguments;
(async () => {
  // The container has no network, so the Public Suffix List cannot be downloaded.
  // Store a small one, as an existing profile would already have it cached.
  await browser.storage.local.set({
    'weeg.dns.publicSuffixList': {
      rules: ['com', 'net', 'org', 'jp', 'co.jp'],
      exceptionRules: [],
      updatedTime: Date.now(),
      initialized: true,
    },
  });
  if (seed) {
    // Without a network these pages fail to load, but the tabs keep their URLs, so sites still show.
    const specs = [
      ['Work', 'blue', 'briefcase', 'https://docs.example.com/'],
      ['Shopping', 'pink', 'cart', 'https://shop.example.org/'],
      ['Banking', 'green', 'dollar', 'https://bank.example.co.jp/'],
      ['Misc', 'toolbar', 'fence', 'about:blank'],
    ];
    for (const [name, color, icon, url] of specs) {
      const identity = await browser.contextualIdentities.create({ name, color, icon });
      await browser.tabs.create({ cookieStoreId: identity.cookieStoreId, url, active: false });
    }
  }
})().then(() => done(null), (e) => done(String(e)));`,
    args: [!!values.seed],
  });
  if (values.fragment || values.eval) {
    writeJson('run.json', {
      script:
        'const [fragment] = arguments;' +
        'if (fragment) {' +
        "  document.querySelector('#drawer:not([hidden]) [data-drawer-close]')?.click();" +
        '  const target = document.querySelector(`[data-target-id="${fragment}"]`);' +
        '  if (!target) throw new Error(`No navigation button for ${fragment}`);' +
        '  target.click();' +
        '}\n' +
        // React shows the screen after this task ends; WebDriver waits for the returned promise.
        'return new Promise((resolve) => setTimeout(resolve, 100)).then(() => {\n' +
        (values.eval ?? '') +
        '\n});',
      args: [values.fragment ?? null],
    });
  }

  await runCommand('docker', [
    'run',
    '--rm',
    '--network',
    'none',
    '--shm-size',
    '1g',
    '-e',
    `EXTENSION_UUID=${EXTENSION_UUID}`,
    '-e',
    'BOOT_WAIT=3',
    '-e',
    'PAGE_WAIT=2',
    '-v',
    `${distDir}:/ext:ro`,
    '-v',
    `${path.join(ROOT_DIR, 'scripts-src', 'firefox-smoke.sh')}:/smoke.sh:ro`,
    '-v',
    `${outDir}:/out`,
    '--entrypoint',
    'sh',
    String(values.image),
    '/smoke.sh',
  ]);

  const value = (name: string): string => JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8')).value;
  fs.writeFileSync(path.join(outDir, 'screenshot.png'), Buffer.from(value('screenshot.json'), 'base64'));
  fs.writeFileSync(path.join(outDir, 'dom.html'), value('dom.json'));
  for (const name of ['session.json', 'navigate.json', 'setup.json', 'run.json', 'screenshot.json', 'dom.json']) {
    fs.rmSync(path.join(outDir, name), { force: true });
  }

  const extensionLines = fs
    .readFileSync(path.join(outDir, 'firefox.log'), 'utf8')
    .split('\n')
    .filter((line) => line.includes(`moz-extension://${EXTENSION_UUID}`) || line.includes('%c['));
  console.log(`Wrote ${outDir}/screenshot.png, dom.html and firefox.log`);
  if (extensionLines.length > 0) {
    console.log('Extension console output:');
    console.log(extensionLines.join('\n'));
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
