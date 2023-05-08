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

import { EventSink } from 'weeg-events';

import { BroadcastTopic } from './BroadcastTopic';

type SpinnerBroadcastMessage = {
  transactionName: string;
  action: 'begin' | 'end';
};

const topic = new BroadcastTopic<SpinnerBroadcastMessage>('broadcast.spinnerTransaction');

export class SpinnerService {
  private static readonly INSTANCE = new SpinnerService();

  public static getInstance(): SpinnerService {
    return SpinnerService.INSTANCE;
  }

  public readonly onTransactionBegin = new EventSink<string>();
  public readonly onTransactionEnd = new EventSink<string>();

  private constructor() {
    topic.addListener((message) => {
      if (message.action == 'begin') {
        this.onTransactionBegin.dispatch(message.transactionName);
      } else {
        this.onTransactionEnd.dispatch(message.transactionName);
      }
    });
  }

  public beginTransaction(transactionName: string): void {
    topic.broadcast({
      transactionName,
      action: 'begin',
    });
    this.onTransactionBegin.dispatch(transactionName);
  }

  public endTransaction(transactionName: string): void {
    topic.broadcast({
      transactionName,
      action: 'end',
    });
    this.onTransactionEnd.dispatch(transactionName);
  }
}
