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

import { FragmentBuilder } from "./FragmentBuilder";
import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";

export abstract class SimpleFragmentBuilder implements FragmentBuilder {
  protected static readonly suppressBottomNavigation: boolean = false;

  private _fragment: CtgFragmentElement;
  private _isActive = false;
  public constructor() {
    const fragment = this.build();
    this._fragment = fragment;

    fragment.onActivated.addListener(() => {
      this._isActive = true;
    });

    fragment.onDeactivated.addListener(() => {
      this._isActive = false;
    });
  }

  public get active(): boolean {
    return this._isActive;
  }

  public getFragment(): CtgFragmentElement {
    return this._fragment;
  }

  /**
   * Should be overridden by subclasses to return a list of focusable elements
   * @returns The list of focusable elements in the fragment.
   */
  public getFocusableElements(): HTMLElement[] {
    return [];
  }

  public abstract build(): CtgFragmentElement;

  public renderTopBar(): void {
    throw new Error("Method not to be implemented.");
  }
}
