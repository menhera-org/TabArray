// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import { EventSink } from "weeg-events";

export class UaStore {
  private _userAgent = '';
  private _emulationMode = 'none';
  private readonly _languages: string[] = [];

  public readonly onChanged = new EventSink<void>();

  public set userAgent(userAgent: string) {
    this._userAgent = userAgent;
    this.onChanged.dispatch();
  }

  public get userAgent(): string {
    return this._userAgent;
  }

  public set emulationMode(emulationMode: string) {
    this._emulationMode = emulationMode;
    this.onChanged.dispatch();
  }

  public get emulationMode(): string {
    return this._emulationMode;
  }
}
