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

import { FragmentBuilder } from "./FragmentBuilder";
import { CtgFragmentElement } from "../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../components/ctg/ctg-top-bar";
import { CtgFrameLayoutElement } from "../../components/ctg/ctg-frame-layout";
import { CtgBottomNavigationElement } from "../../components/ctg/ctg-bottom-navigation";
import { GlobalMenuItems } from "../GlobalMenuItems";

export abstract class AbstractFragmentBuilder implements FragmentBuilder {
  protected static readonly suppressBottomNavigation: boolean = false;

  private _fragment: CtgFragmentElement;
  private _isActive = false;
  private _frameLayoutElement: CtgFrameLayoutElement;
  private _topBarElement: CtgTopBarElement;
  private _bottomNavigationElement: CtgBottomNavigationElement;
  private _globalMenuItems: GlobalMenuItems;

  public constructor(frameLayoutElement: CtgFrameLayoutElement, topBarElement: CtgTopBarElement, bottomNavigationElement: CtgBottomNavigationElement, globalMenuItems: GlobalMenuItems) {
    this._frameLayoutElement = frameLayoutElement;
    this._topBarElement = topBarElement;
    this._bottomNavigationElement = bottomNavigationElement;
    this._globalMenuItems = globalMenuItems;

    const fragment = this.build();
    fragment.builder = this;
    this._fragment = fragment;
    frameLayoutElement.addFragment(fragment);

    const thisClass = this.constructor as typeof AbstractFragmentBuilder;
    if (!thisClass.suppressBottomNavigation) {
      bottomNavigationElement.defineNavigationTarget(fragment.id, this.getIconUrl(), this.getLabelText());
    }

    fragment.onActivated.addListener(() => {
      this._isActive = true;
      this.renderTopBarWithGlobalItems();
      const navigationGroup = fragment.navigationGroup ?? fragment.id;
      bottomNavigationElement.selectTarget(navigationGroup);
    });

    fragment.onDeactivated.addListener(() => {
      this._isActive = false;
    });
  }

  public renderTopBarWithGlobalItems(): void {
    const topBarElement = this._topBarElement;
    this.renderTopBar(topBarElement);
    this.globalMenuItems.defineTopBarMenuItems(topBarElement);
  }

  public get active(): boolean {
    return this._isActive;
  }

  public get frameLayoutElement(): CtgFrameLayoutElement {
    return this._frameLayoutElement;
  }

  public get topBarElement(): CtgTopBarElement {
    return this._topBarElement;
  }

  public get bottomNavigationElement(): CtgBottomNavigationElement {
    return this._bottomNavigationElement;
  }

  public get globalMenuItems(): GlobalMenuItems {
    return this._globalMenuItems;
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

  public abstract getLabelText(): string;

  public abstract getIconUrl(): string;

  public abstract build(): CtgFragmentElement;

  public abstract renderTopBar(topBarElement: CtgTopBarElement): void;
}
