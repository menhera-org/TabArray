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

// this is not translated.

import { PerformanceHistoryService, PerformanceRecord } from '../../../lib/history/PerformanceHistoryService';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';

import { DebuggingScreenProps, useLoaded } from './common';

export type OperationStats = {
  name: string;
  count: number;
  average: number;
  deviation: number;
  max: number;
  min: number;
};

/** Duration statistics per operation, in the order operations first appear. */
export const summarizePerformance = (records: PerformanceRecord[]): OperationStats[] => {
  const durationsByName = new Map<string, number[]>();
  for (const record of records) {
    const durations = durationsByName.get(record.operationName) ?? [];
    durations.push(record.duration);
    durationsByName.set(record.operationName, durations);
  }
  return [...durationsByName].map(([name, durations]) => {
    const average = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.map((x) => Math.pow(x - average, 2)).reduce((a, b) => a + b, 0) / durations.length;
    return {
      name,
      count: durations.length,
      average,
      deviation: Math.sqrt(variance),
      max: Math.max(...durations),
      min: Math.min(...durations),
    };
  });
};

export const PerformanceTable = ({ stats }: { stats: OperationStats[] }) => (
  <table id="performance-table">
    <thead>
      <tr>
        <th>Operation Name</th>
        <th>Average Time</th>
        <th>Standard Deviation</th>
        <th>Max Time</th>
        <th>Min Time</th>
      </tr>
    </thead>
    <tbody id="performance-tbody">
      {stats.map((s) => (
        <tr key={s.name}>
          <td>{`${s.name} (${s.count})`}</td>
          <td>{s.average.toFixed(2)}</td>
          <td>{s.deviation.toFixed(2)}</td>
          <td>{s.max.toFixed(2)}</td>
          <td>{s.min.toFixed(2)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const PerformanceScreen = ({ active }: DebuggingScreenProps) => {
  const service = PerformanceHistoryService.getInstance<PerformanceHistoryService>();
  const records = useLoaded(() => service.getEntries(), service.onChanged);
  return (
    <>
      <ScreenTopBar active={active} heading="Performance" />
      <PerformanceTable stats={summarizePerformance(records ?? [])} />
    </>
  );
};
