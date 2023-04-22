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

import { EventSink } from "weeg-events";

export class LanguageStore {
  private readonly _languages: string[] = [];

  public readonly onLanguagesChanged = new EventSink<string[]>();

  public set languages(languages: string) {
    const languageParts = languages.split(",")
      .map((language) => language.trim())
      .filter((language) => language.length > 0 && language.match(/^[a-z]{2,3}(?:-[a-z]{2})?$/i));

    // if (languageParts.length < 1) {
    //   return;
    // }

    this._languages.length = 0;
    this._languages.push(... languageParts);
    this.onLanguagesChanged.dispatch(this._languages);
  }

  public get languages(): string {
    return this._languages.join(", ");
  }

  public get languageList(): readonly string[] {
    return this._languages;
  }

  public get language(): string {
    return this._languages[0] ?? '';
  }
}
