/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

import { ServiceRegistry } from './ServiceRegistry';

import browser from 'webextension-polyfill';

export class DateFormatService {
  private static readonly INSTANCE = new DateFormatService();

  public static getInstance(): DateFormatService {
    return DateFormatService.INSTANCE;
  }

  private constructor() {
    // Singleton
  }

  public localeFormat(aDate?: Date): string {
    const date = aDate || new Date();
    const effectiveLocale = browser.i18n.getMessage('effectiveLocale');
    const fallbackLocale = 'en-US';
    const dateTimeFormat = new Intl.DateTimeFormat([effectiveLocale, fallbackLocale], {
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: false,
    });
    return dateTimeFormat.format(date);
  }
}

ServiceRegistry.getInstance().registerService('DateFormatService', DateFormatService.getInstance());
