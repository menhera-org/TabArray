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

import { PerformanceHistoryService } from "../../../lib/history/PerformanceHistoryService";

import { AbstractFragmentBuilder } from "../../popup-v2/fragments/AbstractFragmentBuilder";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";

const performanceHistoryService = PerformanceHistoryService.getInstance<PerformanceHistoryService>();

export class PerformanceFragmentBuilder extends AbstractFragmentBuilder {

  public getFragmentId(): string {
    return 'fragment-performance';
  }

  public getLabelText(): string {
    return "Performance";
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/performance.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();
    const table = document.createElement('table');
    table.id = "performance-table";
    fragment.appendChild(table);
    const thead = document.createElement('thead');
    table.appendChild(thead);
    const theadTr = document.createElement('tr');
    thead.appendChild(theadTr);
    const theadTh1 = document.createElement('th');
    theadTh1.textContent = "Operation Name";
    theadTr.appendChild(theadTh1);
    const theadTh2 = document.createElement('th');
    theadTh2.textContent = "Average Time";
    theadTr.appendChild(theadTh2);
    const theadTh3 = document.createElement('th');
    theadTh3.textContent = "Standard Deviation";
    theadTr.appendChild(theadTh3);
    const theadTh4 = document.createElement('th');
    theadTh4.textContent = "Max Time";
    theadTr.appendChild(theadTh4);
    const theadTh5 = document.createElement('th');
    theadTh5.textContent = "Min Time";
    theadTr.appendChild(theadTh5);

    const tbody = document.createElement('tbody');
    tbody.id = "performance-tbody";
    table.appendChild(tbody);

    Promise.resolve().then(() => {
      this.render();
    });

    performanceHistoryService.onChanged.addListener(() => {
      this.render();
    });
    return fragment;
  }

  public render(): void {
    const tbody = this.getFragment().querySelector('#performance-tbody') as HTMLTableSectionElement;
    performanceHistoryService.getEntries().then((entries) => {
      tbody.textContent = '';
      const durationsByOperationName = new Map<string, number[]>();
      for (const entry of entries) {
        const duration = entry.duration;
        const durations = durationsByOperationName.get(entry.operationName) ?? [];
        durations.push(duration);
        durationsByOperationName.set(entry.operationName, durations);
      }
      for (const [operationName, durations] of durationsByOperationName) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const std = Math.sqrt(durations.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / durations.length);
        const max = Math.max(...durations);
        const min = Math.min(...durations);

        const tr = document.createElement('tr');
        tbody.appendChild(tr);
        const td1 = document.createElement('td');
        td1.textContent = `${operationName} (${durations.length})`;
        tr.appendChild(td1);
        const td2 = document.createElement('td');
        td2.textContent = avg.toFixed(2);
        tr.appendChild(td2);
        const td3 = document.createElement('td');
        td3.textContent = std.toFixed(2);
        tr.appendChild(td3);
        const td4 = document.createElement('td');
        td4.textContent = max.toFixed(2);
        tr.appendChild(td4);
        const td5 = document.createElement('td');
        td5.textContent = min.toFixed(2);
        tr.appendChild(td5);
      }
    });
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.backButtonEnabled = false;

    topBarElement.headingText = 'Performance';
  }

  public override getFocusableElements(): HTMLElement[] {
    return [];
  }
}
