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

import { PromiseUtils } from "../utils";

export class ViewRefreshHandler {
  public static readonly RERENDERING_DELAY = 100;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly _renderCallback: (... args: any[]) => Promise<void>;

  private _isRendering = false;
  private _rerenderingRequested = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(renderCallback: (... args: any[]) => Promise<void>) {
    this._renderCallback = renderCallback;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async render(... args: any[]): Promise<void> {
    if (this._isRendering) {
      this._rerenderingRequested = true;
      return;
    }

    for (;;) {
      this._isRendering = true;
      this._rerenderingRequested = false;

      try {
        await this._renderCallback(... args);
      } finally {
        this._isRendering = false;
      }
      if (this._rerenderingRequested) {
        await PromiseUtils.sleep(ViewRefreshHandler.RERENDERING_DELAY);
        continue;
      }
      break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public renderInBackground(... args: any[]): void {
    this.render(... args).catch((e) => {
      console.error(e);
    });
  }
}
