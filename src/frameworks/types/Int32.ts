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

declare const INT32: unique symbol;
export type Int32 = number & { [INT32]: never };

export const MIN: Int32 = (1 << 31) as Int32;
export const MAX: Int32 = ~MIN as Int32;

/**
 * Test if a value is an Int32. This throws on bigints.
 * @param value The number to test.
 * @returns true if the value is an Int32.
 */
export const isInt32 = (value: number): value is Int32 => Object.is(value, 0|value);

/**
 * Converts a value to an Int32. This throws on bigints (use Number(bigint)).
 * @param value The number to convert to an Int32.
 * @returns the Int32 value.
 */
export const toInt32 = (value: number): Int32 => (0|value) as Int32;

/**
 * Converts a string to an Int32.
 * @param value the value to convert to a Int32.
 * @returns the converted value.
 */
export const fromString = (value: string): Int32 => {
  const result = parseInt(value, 10);
  if (!isInt32(result)) {
    throw new Error(`Invalid Int32: ${value}`);
  }
  return result;
};
