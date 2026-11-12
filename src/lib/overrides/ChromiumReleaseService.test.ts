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

import { ChromiumReleaseService } from './ChromiumReleaseService';

// Stable dates from Chromium's published schedule (chromiumdash.appspot.com).
const STABLE_DATES: [number, string][] = [
  [155, '2026-10-06'],
  [156, '2026-10-20'],
  [157, '2026-11-03'],
  [158, '2026-11-17'],
  [159, '2026-12-08'],
  [160, '2027-01-05'],
  [161, '2027-01-19'],
  [162, '2027-02-02'],
];

test('the estimate never names an unreleased Chrome, and stays within two releases of the schedule', () => {
  const service = ChromiumReleaseService.getInstance();
  for (const [milestone, date] of STABLE_DATES) {
    const estimate = service.getLatestReleaseNumber(Date.parse(`${date}T12:00:00Z`));
    expect(estimate, date).toBeLessThanOrEqual(milestone);
    expect(estimate, date).toBeGreaterThanOrEqual(milestone - 2);
  }
  expect(service.getLatestReleaseNumber(Date.parse('2027-01-05T12:00:00Z'))).toBe(160);
});
