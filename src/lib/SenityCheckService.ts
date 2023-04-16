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

export class SanityCheckService {
  public static readonly FILES_TO_CHECK: readonly string[] = [
    '/manifest.json',
    '/css/theme.css',
  ];

  private static readonly INSTANCE = new SanityCheckService();

  public static getInstance(): SanityCheckService {
    return this.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  /**
   * @throws an error if there is an IO error.
   */
  public async checkForFiles(): Promise<void> {
    await Promise.all(SanityCheckService.FILES_TO_CHECK.map((file) => fetch(file)));
  }
}
