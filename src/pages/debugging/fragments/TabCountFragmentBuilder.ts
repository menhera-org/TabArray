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

// this is not translated.

import { WindowTabCountService, WindowTabCountHistory } from "../../../lib/windows/WindowTabCountService";

import { AbstractFragmentBuilder } from "../../popup-v2/fragments/AbstractFragmentBuilder";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";

export type ChartData = {
  time: number;
  value: number;
};

export type ChartType = {
  [series: string]: ChartData[];
};

const windowTabCountService = WindowTabCountService.getInstance<WindowTabCountService>();

export class TabCountFragmentBuilder extends AbstractFragmentBuilder {

  public getFragmentId(): string {
    return 'fragment-tab-count';
  }

  public getLabelText(): string {
    return "Tab Count";
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/tab.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();
    const iframe = document.createElement('iframe');
    iframe.src = 'https://menhera-org.github.io/time-chart/';
    iframe.id = 'time-chart';
    fragment.appendChild(iframe);

    iframe.onload = () => {
      windowTabCountService.getTabCountHistory().then((tabCountHistory) => {
        this.render(tabCountHistory);
      });
    };

    windowTabCountService.onChanged.addListener((history) => {
      this.render(history);
    });
    return fragment;
  }

  public buildChartData(origData: WindowTabCountHistory): ChartType {
    const data: ChartType = {};
    const now = Date.now();
    for (const series in origData) {
      const values = origData[series] ?? [];
      data[series] = values.map((entry) => {
        return {
          time: entry.time,
          value: entry.count,
        };
      });
      const seriesData = data[series] as ChartData[];
      const lastData = seriesData[seriesData.length - 1];
      if (lastData) {
        seriesData.push({
          time: now,
          value: lastData.value,
        });
      }
    }
    return data;
  }

  public render(tabCountHistory: WindowTabCountHistory): void {
    const iframe = this.getFragment().querySelector('#time-chart') as HTMLIFrameElement;
    const data = this.buildChartData(tabCountHistory);
    iframe.contentWindow?.postMessage({
      type: 'update-chart',
      value: data,
    }, '*');
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.backButtonEnabled = false;

    topBarElement.headingText = 'Tab Count';
  }

  public override getFocusableElements(): HTMLElement[] {
    return [];
  }
}
