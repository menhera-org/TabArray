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

import { EventSink } from "weeg-events";
import { AbstractFragmentBuilder } from "../../pages/popup-v2/fragments/AbstractFragmentBuilder";

export class CtgFragmentElement extends HTMLElement {
  public readonly onActivated = new EventSink<void>();
  public readonly onDeactivated = new EventSink<void>();
  public builder: AbstractFragmentBuilder | null = null;

  public constructor() {
    super();
  }

  public get parentFragment(): string | null {
    return this.dataset.parentFragment || null;
  }

  public set parentFragment(parentFragment: string | null) {
    if (parentFragment === null) {
      delete this.dataset.parentFragment;
    } else {
      this.dataset.parentFragment = parentFragment;
    }
  }

  public get navigationGroup(): string | null {
    return this.dataset.navigationGroup || null;
  }

  public set navigationGroup(navigationGroup: string | null) {
    if (navigationGroup === null) {
      delete this.dataset.navigationGroup;
    } else {
      this.dataset.navigationGroup = navigationGroup;
    }
  }
}

customElements.define('ctg-fragment', CtgFragmentElement);
