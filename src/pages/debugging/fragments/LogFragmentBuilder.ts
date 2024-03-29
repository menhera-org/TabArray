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

import { ConsoleHistoryService } from "../../../lib/console/ConsoleHistoryService";

import { AbstractFragmentBuilder } from "../../popup-v2/fragments/AbstractFragmentBuilder";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";

const consoleHistoryService = ConsoleHistoryService.getInstance<ConsoleHistoryService>();

export class LogFragmentBuilder extends AbstractFragmentBuilder {

  public getFragmentId(): string {
    return 'fragment-log';
  }

  public getLabelText(): string {
    return "Logs";
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/developer.svg';
  }

  public scrollToBottom(): void {
    if (this.frameLayoutElement.getActiveFragment() != this.getFragment()) return;
    this.frameLayoutElement.scroll(0, this.frameLayoutElement.scrollHeight - this.frameLayoutElement.clientHeight);
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();
    const table = document.createElement('table');
    table.id = "logs-table";
    fragment.appendChild(table);
    const thead = document.createElement('thead');
    table.appendChild(thead);
    const theadTr = document.createElement('tr');
    thead.appendChild(theadTr);
    const theadTh1 = document.createElement('th');
    theadTh1.textContent = "Time";
    theadTr.appendChild(theadTh1);
    const theadTh2 = document.createElement('th');
    theadTh2.textContent = "Context";
    theadTr.appendChild(theadTh2);
    const theadTh3 = document.createElement('th');
    theadTh3.textContent = "Component";
    theadTr.appendChild(theadTh3);
    const theadTh4 = document.createElement('th');
    theadTh4.textContent = "Level";
    theadTr.appendChild(theadTh4);
    const theadTh5 = document.createElement('th');
    theadTh5.textContent = "Message";
    theadTr.appendChild(theadTh5);

    const tbody = document.createElement('tbody');
    tbody.id = "logs-tbody";
    table.appendChild(tbody);

    Promise.resolve().then(() => {
      this.render();
      const fragment = this.getFragment();
      fragment.onActivated.addListener(() => {
        this.scrollToBottom();
      });
    });

    consoleHistoryService.onChanged.addListener(() => {
      this.render();
    });

    return fragment;
  }

  public render(): void {
    const tbody = this.getFragment().querySelector('#logs-tbody') as HTMLTableSectionElement;
    consoleHistoryService.getEntries().then((entries) => {
      const scrollBottom = this.frameLayoutElement.scrollHeight - this.frameLayoutElement.scrollTop - this.frameLayoutElement.clientHeight;
      const isAtBottom = scrollBottom < 1;
      tbody.textContent = '';
      for (const entry of entries) {
        const tr = document.createElement('tr');
        tbody.appendChild(tr);
        const td1 = document.createElement('td');
        td1.textContent = new Date(entry.unixTime).toISOString();
        tr.appendChild(td1);
        const td2 = document.createElement('td');
        td2.textContent = entry.context;
        tr.appendChild(td2);
        const td3 = document.createElement('td');
        td3.textContent = entry.tag;
        tr.appendChild(td3);
        const td4 = document.createElement('td');
        td4.textContent = entry.outputType;
        tr.appendChild(td4);
        const td5 = document.createElement('td');
        td5.textContent = entry.message;
        tr.appendChild(td5);
        tr.dataset.logLevel = entry.outputType;
      }
      if (isAtBottom) {
        this.scrollToBottom();
      }
    });
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.backButtonEnabled = false;

    topBarElement.headingText = 'Logs';
  }

  public override getFocusableElements(): HTMLElement[] {
    return [];
  }
}
