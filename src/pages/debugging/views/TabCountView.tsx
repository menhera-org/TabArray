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

import { useEffect, useRef } from 'react';

import { WindowTabCountService, WindowTabCountHistory } from '../../../lib/windows/WindowTabCountService';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';

import { DebuggingScreenProps } from './common';

export const CHART_URL = 'https://menhera-org.github.io/time-chart/';
/** Only this origin may receive the data. */
export const CHART_ORIGIN = 'https://menhera-org.github.io';

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

/** The tab count history, drawn by an external chart page in an iframe. */
export const TabCountScreen = ({ active }: DebuggingScreenProps) => {
  const iframe = useRef<HTMLIFrameElement>(null);
  const service = WindowTabCountService.getInstance<WindowTabCountService>();
  const post = (history: WindowTabCountHistory) => {
    iframe.current?.contentWindow?.postMessage(
      { type: 'update-chart', value: buildChartData(history, Date.now()) },
      CHART_ORIGIN
    );
  };
  useEffect(() => {
    service.onChanged.addListener(post);
    return () => service.onChanged.removeListener(post);
    // The service and the iframe ref do not change.
  }, []);
  return (
    <>
      <ScreenTopBar active={active} heading="Tab Count" />
      <iframe
        ref={iframe}
        id="time-chart"
        src={CHART_URL}
        onLoad={() => {
          service.getTabCountHistory().then(post, (e) => console.error(e));
        }}
      />
    </>
  );
};
