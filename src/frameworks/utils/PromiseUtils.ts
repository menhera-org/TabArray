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

export class PromiseUtils {
  public static createPromise<T>() {
    let resolve: (value: T) => void = () => {
      // this is never called.
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reject: (reason: any) => void = () => {
      // this is never called.
    };
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {
      promise,
      resolve,
      reject,
    };
  }

  /**
   * Sleeps for the specified number of milliseconds.
   * @param ms sleep time in milliseconds.
   * @returns Promise.
   */
  public static sleep(ms: number) {
    const { promise, resolve } = PromiseUtils.createPromise<void>();
    setTimeout(resolve, ms);
    return promise;
  }
}
