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

import { AbstractPerContainerSettings } from "./AbstractPerContainerSettings";

/**
 * Per-container languages.
 */
export class LanguageSettings extends AbstractPerContainerSettings<string> {
  private static readonly STORAGE_KEY = 'languagesByContainer';
  private static readonly INSTANCE = new LanguageSettings();

  public static getInstance(): LanguageSettings {
    return LanguageSettings.INSTANCE;
  }

  private constructor() {
    super();
  }

  protected override getStorageKey(): string {
    return LanguageSettings.STORAGE_KEY;
  }

  public async setValueForTabGroup(cookieStoreId: string, languages: string) {
    languages = languages.trim();
    const value = await this.getValue();

    const key = cookieStoreId;
    if ('' === languages && key in value) {
      delete value[key];
      this.setValue(value);
    } else if ('' !== languages && value[key] !== languages) {
      value[key] = languages;
      this.setValue(value);
    }
  }

  public override async getValueForTabGroup(cookieStoreId: string): Promise<string> {
    const languages = await super.getValueForTabGroup(cookieStoreId) ?? '';
    if ('' === languages) return '';
    const parts = languages.split(',')
      .map((language) => language.trim())
      .filter((language) => language.length > 0 && language.match(/^[a-z]{2,3}(?:-[a-z]{2})?$/i));

    if (parts.length < 1) {
      return '';
    }
    return parts.join(',');
  }

  public async getAcceptLanguages(cookieStoreId: string): Promise<string> {
    const languages = await this.getValueForTabGroup(cookieStoreId);
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
