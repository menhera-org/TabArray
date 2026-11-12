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

import { type CSSProperties, useEffect, useState } from 'react';

import { WindowTabCountService, WindowTabCountHistory } from '../../../lib/windows/WindowTabCountService';
import { DateFormatService } from '../../../lib/DateFormatService';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';

import { DebuggingScreenProps } from './common';

export type ChartData = { time: number; value: number };
export type ChartType = { [series: string]: ChartData[] };

/** Tab counts per window as chart series, each extended to `now` with its last value. */
export const buildChartData = (history: WindowTabCountHistory, now: number): ChartType => {
  const data: ChartType = {};
  for (const series in history) {
    const points = (history[series] ?? []).map((entry) => ({ time: entry.time, value: entry.count }));
    const last = points[points.length - 1];
    if (last) points.push({ time: now, value: last.value });
    data[series] = points;
  }
  return data;
};

/**
 * Step lines in a `width` x `height` box (y grows downward): each count holds until the next one.
 * Time runs from the earliest to the latest point, and counts from 0 to the largest one.
 */
export const stepPaths = (data: ChartType, width: number, height: number) => {
  let minTime = Infinity;
  let maxTime = -Infinity;
  let maxValue = 1;
  for (const points of Object.values(data)) {
    for (const { time, value } of points) {
      minTime = Math.min(minTime, time);
      maxTime = Math.max(maxTime, time);
      maxValue = Math.max(maxValue, value);
    }
  }
  if (minTime > maxTime) return null;
  const x = (time: number) => (maxTime == minTime ? 0 : ((time - minTime) / (maxTime - minTime)) * width).toFixed(1);
  const y = (value: number) => (height - (value / maxValue) * height).toFixed(1);
  const paths = Object.entries(data).map(([series, points]) => ({
    series,
    d: points.map(({ time, value }, i) => (i == 0 ? `M${x(time)} ${y(value)}` : `H${x(time)} V${y(value)}`)).join(' '),
  }));
  return { minTime, maxTime, maxValue, paths };
};

const WIDTH = 600;
const HEIGHT = 300;
const COLORS = ['blue', 'green', 'orange', 'purple', 'red', 'cyan', 'yellow', 'pink'];
const color = (i: number) => `var(--color-${COLORS[i % COLORS.length]}-50)`;

/** The tab count history of each window, as a step chart drawn here (no remote page). */
export const TabCountScreen = ({ active }: DebuggingScreenProps) => {
  const [data, setData] = useState<ChartType>({});
  const service = WindowTabCountService.getInstance<WindowTabCountService>();
  useEffect(() => {
    const update = (history: WindowTabCountHistory) => setData(buildChartData(history, Date.now()));
    service.getTabCountHistory().then(update, (e) => console.error(e));
    service.onChanged.addListener(update);
    return () => service.onChanged.removeListener(update);
    // The service does not change.
  }, []);
  const chart = stepPaths(data, WIDTH, HEIGHT);
  const formatTime = (time: number) => DateFormatService.getInstance().localeFormat(new Date(time));
  return (
    <>
      <ScreenTopBar active={active} heading="Tab Count" />
      {chart && (
        <figure id="time-chart">
          <svg viewBox={`-40 -10 ${WIDTH + 50} ${HEIGHT + 20}`} role="img" aria-label="Tab count per window">
            <line className="axis" x1={0} y1={0} x2={0} y2={HEIGHT} />
            <line className="axis" x1={0} y1={HEIGHT} x2={WIDTH} y2={HEIGHT} />
            <text x={-8} y={HEIGHT} textAnchor="end" dominantBaseline="middle">
              0
            </text>
            <text x={-8} y={0} textAnchor="end" dominantBaseline="middle">
              {chart.maxValue}
            </text>
            {chart.paths.map(({ series, d }, i) => (
              <path key={series} d={d} stroke={color(i)} />
            ))}
          </svg>
          <figcaption>
            <span>{formatTime(chart.minTime)}</span>
            <span>
              {chart.paths.map(({ series }, i) => (
                <span key={series} className="legend" style={{ '--legend-color': color(i) } as CSSProperties}>
                  Window {series}
                </span>
              ))}
            </span>
            <span>{formatTime(chart.maxTime)}</span>
          </figcaption>
        </figure>
      )}
    </>
  );
};
