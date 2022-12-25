// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

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

/* eslint-disable @typescript-eslint/no-unused-vars */

const JAN = 0;
const FEB = 1;
const MAR = 2;
const APR = 3;
const MAY = 4;
const JUN = 5;
const JUL = 6;
const AUG = 7;
const SEP = 8;
const OCT = 9;
const NOV = 10;
const DEC = 11;

export class ChromiumReleaseService {
  private static readonly _ANCHOR_RELEASE_NUMBER = 108;
  private static readonly _ANCHOR_RELEASE_TIME = (new Date(2022, DEC, 1)).getTime();
  private static readonly _RELEASE_INTERVAL = 2611200000;
  private static readonly _INSTANCE = new ChromiumReleaseService();

  public static getInstance(): ChromiumReleaseService {
    return this._INSTANCE;
  }

  public getLatestReleaseNumber(): number {
    return Math.floor((Date.now() - ChromiumReleaseService._ANCHOR_RELEASE_TIME) / ChromiumReleaseService._RELEASE_INTERVAL) + ChromiumReleaseService._ANCHOR_RELEASE_NUMBER;
  }
}
