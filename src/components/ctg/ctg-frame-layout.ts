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

import { CtgFragmentElement } from "./ctg-fragment";

export class CtgFrameLayoutElement extends HTMLElement {
  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/ctg/ctg-frame-layout.css';
    this.shadowRoot.appendChild(styleSheet);

    const slot = document.createElement('slot');
    slot.name = 'active';
    this.shadowRoot.appendChild(slot);

    const hidden = document.createElement('div');
    hidden.hidden = true;
    this.shadowRoot.appendChild(hidden);

    const hiddenSlot = document.createElement('slot');
    hidden.appendChild(hiddenSlot);
  }

  public addFragment(fragment: CtgFragmentElement) {
    this.appendChild(fragment);
  }

  public activateFragment(id: string) {
    let fragmentToActivate: CtgFragmentElement | null = null;
    let fragmentToDeactivate: CtgFragmentElement | null = null;
    for (const child of this.children) {
      if (!(child instanceof CtgFragmentElement)) {
        continue;
      }
      if (child.id == id) {
        if (child.slot == 'active') {
          return;
        }
        fragmentToActivate = child;
      } else if (child.slot == 'active') {
        fragmentToDeactivate = child;
      }
    }

    // deactivate and activate in this order
    if (fragmentToDeactivate) {
      fragmentToDeactivate.slot = '';
      fragmentToDeactivate.onDeactivated.dispatch();
    }

    if (fragmentToActivate) {
      fragmentToActivate.slot = 'active';
      fragmentToActivate.onActivated.dispatch();
    }
  }

  public getActiveFragment(): CtgFragmentElement | null {
    for (const child of this.children) {
      if (!(child instanceof CtgFragmentElement)) {
        continue;
      }
      if (child.slot == 'active') {
        return child;
      }
    }
    return null;
  }
}

customElements.define('ctg-frame-layout', CtgFrameLayoutElement);
