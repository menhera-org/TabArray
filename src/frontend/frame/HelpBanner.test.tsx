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

import { expect, test } from 'vitest';

import { PackageInformation } from '../../lib/package/PackageInformation';

import { render } from '../../test/render';
import { BuildInfo, HelpBanner, versionText } from './HelpBanner';

test('development builds are marked by version', () => {
  expect(versionText('11.13.0.100')).toBe('11.13.0.100 extensionDevBuild');
  expect(versionText('11.13.0.200')).toBe('11.13.0.200');
});

test('the build line links the commit and tells how the build was made', () => {
  const info = {
    isSigned: false,
    recordedHash: 'h',
    computedHash: 'h',
    buildInfo: { commit: '0123456789abcdef', untracked: true, buildDate: '2026-01-01T00:00:00Z' },
  } as unknown as PackageInformation;
  const { container: root } = render(<BuildInfo info={info} />);
  expect(root.querySelector('a')?.textContent).toBe('0123456');
  expect(root.textContent).toMatch(/^extensionBuild 0123456 extensionUntracked extensionUnsigned\(.+\)$/);
});

test('the banner shows the name and starts with an unknown hash', () => {
  const { container: root } = render(<HelpBanner />);
  expect(root.querySelector('h2')?.textContent).toBe('Container Tab Groups');
  expect((root.querySelector('input') as HTMLInputElement).value).toBe('(unknown hash)');
  expect(root.textContent).toContain('packageIntegrity');
});
