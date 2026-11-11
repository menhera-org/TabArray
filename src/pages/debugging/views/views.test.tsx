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

import { describe, expect, test } from 'vitest';

import { InstallationInfo } from '../../../lib/history/InstallationHistoryService';

import { render } from '../../../test/render';
import { LogTable } from './LogsView';
import { PerformanceTable, summarizePerformance } from './PerformanceView';
import { InstallationTable, describeCommit } from './InstallationHistoryView';
import { FileTable } from './FilesView';
import { buildChartData } from './TabCountView';

const cells = (root: HTMLElement) =>
  [...root.querySelectorAll('tbody > tr')].map((tr) => [...tr.children].map((td) => td.textContent));

describe('logs', () => {
  test('shows each entry with an ISO time and marks its level', () => {
    const { container: root } = render(
      <LogTable entries={[{ unixTime: 0, context: 'background', tag: 'Tagger', outputType: 'warn', message: 'hi' }]} />
    );
    expect(cells(root)).toEqual([['1970-01-01T00:00:00.000Z', 'background', 'Tagger', 'warn', 'hi']]);
    expect(root.querySelector('tbody > tr')?.getAttribute('data-log-level')).toBe('warn');
  });
});

describe('performance', () => {
  test('summarizes durations per operation in order of first appearance', () => {
    const stats = summarizePerformance([
      { operationName: 'b', startTime: 0, duration: 2 },
      { operationName: 'a', startTime: 0, duration: 1 },
      { operationName: 'b', startTime: 0, duration: 4 },
    ]);
    expect(stats).toEqual([
      { name: 'b', count: 2, average: 3, deviation: 1, max: 4, min: 2 },
      { name: 'a', count: 1, average: 1, deviation: 0, max: 1, min: 1 },
    ]);
    const { container: root } = render(<PerformanceTable stats={stats} />);
    expect(cells(root)[0]).toEqual(['b (2)', '3.00', '1.00', '4.00', '2.00']);
  });
});

describe('installation history', () => {
  const info: InstallationInfo = {
    installationDate: '2026-01-01',
    commit: '0123456789abcdef',
    untracked: true,
    signed: false,
    buildDate: '2025-12-31',
    recordedIntegrity: 'sha-a',
    computedIntegrity: 'sha-b',
    browserName: 'Firefox',
    browserVersion: '159.0',
    browserPlatformOs: 'linux',
  };

  test('describes the commit and how the build was made', () => {
    expect(describeCommit(info)).toBe('0123456 (untracked) (unsigned)');
    expect(describeCommit({ ...info, untracked: false, signed: true })).toBe('0123456 (signed)');
  });

  test('flags a changed package integrity in red', () => {
    const { container: root } = render(<InstallationTable entries={[info, { ...info, computedIntegrity: 'sha-a' }]} />);
    expect(cells(root)[0]).toEqual([
      '2026-01-01',
      '0123456 (untracked) (unsigned)',
      '2025-12-31',
      'sha-b',
      'Firefox 159.0 (linux)',
    ]);
    const integrity = [...root.querySelectorAll<HTMLElement>('tbody > tr > td:nth-child(4)')];
    expect(integrity.map((td) => td.style.color)).toEqual(['red', '']);
  });
});

test('files: links each file and marks changed integrity', () => {
  const { container: root } = render(
    <FileTable
      files={[
        { path: 'a.js', href: 'moz-extension://test/a.js', recorded: 'x', current: 'x' },
        { path: 'b.js', href: 'moz-extension://test/b.js', recorded: 'x', current: 'y' },
      ]}
    />
  );
  const rows = [...root.querySelectorAll('.file')];
  expect(rows.map((r) => r.classList.contains('file-integrity-changed'))).toEqual([false, true]);
  expect(rows[0]?.querySelector('a')?.getAttribute('href')).toBe('moz-extension://test/a.js');
  expect(rows[0]?.querySelector('a')?.getAttribute('target')).toBe('_blank');
});

test('tab count: extends each series to now with its last value', () => {
  expect(
    buildChartData(
      {
        1: [
          { windowId: 1, time: 10, count: 3 },
          { windowId: 1, time: 20, count: 5 },
        ],
        2: [],
      },
      99
    )
  ).toEqual({
    1: [
      { time: 10, value: 3 },
      { time: 20, value: 5 },
      { time: 99, value: 5 },
    ],
    2: [],
  });
});
