// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=&2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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

/**
 * Event listeners should handle exceptions themselves.
 */
export type EventListener<T> = (details: T) => void;

export class EventSink<T> {
  private readonly _listeners = new Set<EventListener<T>>();

  public addListener(listener: EventListener<T>): void {
    this._listeners.add(listener);
  }

  public removeListener(listener: EventListener<T>): void {
    this._listeners.delete(listener);
  }

  public hasListener(listener: EventListener<T>): boolean {
    return this._listeners.has(listener);
  }

  public dispatch(details: T): void {
    for (const listener of this._listeners) {
      listener(details);
    }
  }
}
