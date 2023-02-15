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

export class UrlService {
  private static readonly PRIVILEGED_SCHEMES = new Set([
    'about',
    'chrome',
    'javascript',
    'data',
    'file',
  ]);

  private static readonly INSTANCE = new UrlService();

  public static getInstance(): UrlService {
    return UrlService.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  public isStringValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  public isPrivilegedScheme(url: URL): boolean {
    return UrlService.PRIVILEGED_SCHEMES.has(url.protocol.slice(0, -1));
  }

  public isHttpScheme(url: URL): boolean {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }
}
