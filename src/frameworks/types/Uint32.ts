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

declare const UINT32: unique symbol;
export type Uint32 = number & { [UINT32]: never };

export const MIN: Uint32 = 0 as Uint32;
export const MAX: Uint32 = (-1 >>> 0) as Uint32;

/**
 * Test if a value is a Uint32. This throws on bigints.
 * @param value The number to test.
 * @returns true if the value is a Uint32.
 */
export const isUint32 = (value: number): value is Uint32 => Object.is(value, toUint32(value));

/**
 * Converts a value to a Uint32. This throws on bigints (use Number(bigint)).
 * @param value The number to convert to a Uint32.
 * @returns the Uint32 value.
 */
export const toUint32 = (value: number): Uint32 => (value >>> 0) as Uint32;

/**
 * Converts a string to a Uint32.
 * @param value the value to convert to a Uint32.
 * @returns the converted value.
 */
export const fromString = (value: string): Uint32 => {
  const result = parseInt(value, 10);
  if (!isUint32(result)) {
    throw new Error(`Invalid Uint32: ${value}`);
  }
  return result;
};
