/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Copyright (C) 2023 Menhera.org

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  @license
*/

export type Reducer<Data, Action> = (data: Data, action: Action) => Data;
export type Listener<Data> = (data: Data) => void | unknown | Promise<void | unknown>;

export class Store<Data, Action> {
  private _value: Data;
  private _reducers = new Set<Reducer<Data, Action>>();
  private _listeners = new Set<Listener<Data>>();

  public constructor(initialValue: Data) {
    this._value = initialValue;
  }

  public registerReducer(reducer: Reducer<Data, Action>): void {
    this._reducers.add(reducer);
  }

  public unregisterReducer(reducer: Reducer<Data, Action>): void {
    this._reducers.delete(reducer);
  }

  public registerListener(listener: Listener<Data>): void {
    this._listeners.add(listener);
  }

  public unregisterListener(listener: Listener<Data>): void {
    this._listeners.delete(listener);
  }

  public get value(): Data {
    return this._value;
  }

  private callListeners(): void {
    for (const listener of this._listeners) {
      try {
        Promise.resolve(listener(this._value)).catch((e) => {
          console.error(e);
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  public dispatchAction(action: Action): void {
    for (const reducer of this._reducers) {
      this._value = reducer(this._value, action);
    }
    this.callListeners();
  }
}
