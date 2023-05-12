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

import { ConsoleFormatter } from "./ConsoleFormatter";
import { ConsoleHistoryService, ConsoleEntry } from "./ConsoleHistoryService";

/**
 * Console output types.
 */
export type OutputType =
  'debug'
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
;

const consoleHistoryService = ConsoleHistoryService.getInstance<ConsoleHistoryService>();

export class ConsoleService {
  private static readonly INSTANCE = new ConsoleService();

  public static getInstance(): ConsoleService {
    return ConsoleService.INSTANCE;
  }

  private _inTransaction = false;
  private readonly _uncomittedEntries: ConsoleEntry[] = [];

  private constructor() {
    // Singleton
  }

  public getContext(): string {
    const filename = location.pathname.split('/').filter(a => a.trim()).pop() ?? 'unknown';
    return filename.split('.')[0] as string;
  }

  public beginTransaction(): void {
    this._inTransaction = true;
  }

  public commitTransaction(): void {
    this._inTransaction = false;
    consoleHistoryService.addEntries(this._uncomittedEntries);
    this._uncomittedEntries.length = 0;
  }

  public cancelTransaction(): void {
    this._inTransaction = false;
    this._uncomittedEntries.length = 0;
  }

  public output(tag: string, outputType: OutputType, ... args: unknown[]): void {
    const context = this.getContext();
    const contextTag = context + '/' + tag;
    if (args[0] !== undefined && typeof args[0] == 'string') {
      const remaining = args.slice(1);
      console[outputType](`%c[${contextTag}]%c ${args[0]}`, 'color: #844587', '', ... remaining);
    } else {
      console[outputType](`%c[${contextTag}]%c`, 'color: #844587', '', ... args);
    }
    const formattedArgs = ConsoleFormatter.format(... args);
    const stringifiedArgs = formattedArgs.map(a => {
      try {
        return String(a);
      } catch (e) {
        return '(unknown)';
      }
    }).join(' ');
    const entry: ConsoleEntry = {
      unixTime: Date.now(),
      context,
      tag,
      outputType,
      message: stringifiedArgs,
    };
    if (this._inTransaction) {
      this._uncomittedEntries.push(entry);
    } else {
      consoleHistoryService.addEntry(entry);
    }
  }
}
