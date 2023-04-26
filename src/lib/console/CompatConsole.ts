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

import { ConsoleService } from "./ConsoleService";

const consoleService = ConsoleService.getInstance();

export class CompatConsole {
  public static tagFromFilename(filename: string): string {
    return filename.split('/').pop()?.split('.').shift() as string;
  }

  public readonly tag: string;

  public constructor(tag: string) {
    this.tag = tag;
  }

  public debug(...args: unknown[]): void {
    consoleService.output(this.tag, 'debug', ... args);
  }

  public log(...args: unknown[]): void {
    consoleService.output(this.tag, 'log', ... args);
  }

  public info(...args: unknown[]): void {
    consoleService.output(this.tag, 'info', ... args);
  }

  public warn(...args: unknown[]): void {
    consoleService.output(this.tag, 'warn', ... args);
  }

  public error(...args: unknown[]): void {
    consoleService.output(this.tag, 'error', ... args);
  }

  public assert(assert: unknown, ...args: unknown[]): void {
    if (!assert) {
      consoleService.output(this.tag, 'error', 'Assertion failed:', ... args);
    }
  }
}
