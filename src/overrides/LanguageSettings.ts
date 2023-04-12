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

import { StorageItem } from "weeg-storage";
import { EventSink } from "weeg-events";

type StorageType = {
  [cookieStoreId: string]: string;
};

export class LanguageSettings {
  private static readonly STORAGE_KEY = 'languagesByContainer';
  private static readonly INSTANCE = new LanguageSettings();

  public static getInstance(): LanguageSettings {
    return LanguageSettings.INSTANCE;
  }

  private readonly _storage = new StorageItem<StorageType>(LanguageSettings.STORAGE_KEY, {}, StorageItem.AREA_LOCAL);
  private _value: StorageType = {};

  public readonly onChanged = new EventSink<void>();

  private constructor() {
    this._storage.observe((newValue) => {
      this._value = newValue;
      this.onChanged.dispatch();
    }, true);
  }

  private save() {
    this._storage.setValue(this._value).catch((e) => {
      console.error(e);
    });
  }

  public getValue(): StorageType {
    return {
      ... this._value,
    };
  }

  public setLanguages(cookieStoreId: string, languages: string) {
    languages = languages.trim();

    const key = cookieStoreId;
    if ('' === languages && key in this._value) {
      delete this._value[key];
      this.save();
    } else if ('' !== languages && this._value[key] !== languages) {
      this._value[key] = languages;
      this.save();
    }
  }

  public getLanguages(cookieStoreId: string): string {
    const key = cookieStoreId;
    const languages = this._value[key] ?? '';
    if ('' === languages) return '';
    const parts = languages.split(',')
      .map((language) => language.trim())
      .filter((language) => language.length > 0 && language.match(/^[a-z]{2,3}(?:-[a-z]{2})?$/i));

    if (parts.length < 1) {
      return '';
    }
    return parts.join(',');
  }

  public getAcceptLanguages(cookieStoreId: string): string {
    const languages = this.getLanguages(cookieStoreId);
    if ('' === languages) return '';
    const inputParts = languages.split(',');
    const outputParts = [];
    const digits = (inputParts.length > 10) ? 2 : 1;
    let index = 0;
    for (const part of inputParts) {
      if (index == 0) {
        outputParts.push(part);
      } else {
        const quality = ((inputParts.length - index) / inputParts.length).toFixed(digits);
        outputParts.push(`${part};q=${quality}`);
      }
      index++;
    }
    return outputParts.join(',');
  }
}
