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

export class ConsoleFormatter {
  public static tokenize(text: string): string[] {
    return text.match(/%%|%[oO]|%s|%(?:.[0-9]+)?[dif]|%c|.+?/g) ?? [text];
  }

  public static format(...args: unknown[]): unknown[] {
    if (args.length < 1) {
      return args;
    }
    const firstArg = args.shift();
    if ('string' != typeof firstArg) {
      return [firstArg, ... args];
    } else {
      const tokens = ConsoleFormatter.tokenize(firstArg);
      const results: unknown[] = [];
      let strBuffer = '';
      let matches: string[] | null = null;
      for (const token of tokens) {
        if (token == '%%') {
          strBuffer += '%';
        } else if (token == '%o' || token == '%O') {
          if (strBuffer != '') {
            results.push(strBuffer);
            strBuffer = '';
          }
          if (args.length > 0) {
            results.push(args.shift());
          }
        } else if ((matches = token.match(/^%(.[0-9]+)?([dif])$/))) {
          if (args.length < 1) {
            continue;
          }
          const [, modifier, formatter] = matches;
          if (null == formatter) {
            throw new Error('Unexpected error');
          }
          const precision = null == modifier ? null : parseInt(modifier.slice(1), 10);
          const value = args.shift();
          let number = 'bigint' == typeof value ? value : Number(value);
          if (formatter != 'f' && 'number' == typeof number) {
            number = Math.trunc(number);
          }
          if (null == precision) {
            strBuffer += String(number);
          } else if ('bigint' == typeof number) {
            if (formatter != 'f') {
              strBuffer += number.toString().padStart(precision, '0');
            } else {
              strBuffer += number.toString();
            }
          } else if (isNaN(number)) {
            strBuffer += 'NaN';
          } else if (formatter != 'f') {
            strBuffer += String(number).padStart(precision, '0');
          } else {
            strBuffer += number.toFixed(precision);
          }
        } else if (token == '%s') {
          if (args.length < 1) {
            continue;
          }
          const value = args.shift();
          const string = String(value);
          strBuffer += string;
        } else if ('%c' == token) {
          if (args.length < 1) {
            continue;
          }
          const value = args.shift();
          if ('string' != typeof value) {
            continue;
          }
          if (strBuffer != '') {
            results.push(strBuffer);
            strBuffer = '';
          }
        } else {
          strBuffer += token;
        }
      }
      if (strBuffer != '') {
        results.push(strBuffer);
      }
      for (const arg of args) {
        results.push(arg);
      }
      return results;
    }
  }
}
