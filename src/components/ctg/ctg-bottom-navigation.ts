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

import { EventSink } from "weeg-events";

export class CtgBottomNavigationElement extends HTMLElement {
  public readonly onTargetClicked = new EventSink<string>();

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/ctg/ctg-bottom-navigation.css';
    this.shadowRoot.appendChild(styleSheet);

    const targetsElement = document.createElement('div');
    targetsElement.classList.add('targets');
    this.shadowRoot.appendChild(targetsElement);
  }

  public defineNavigationTarget(id: string, iconUrl: string, labelText: string) {
    if (!this.shadowRoot) return;
    const targetsElement = this.shadowRoot.querySelector('.targets');
    if (!targetsElement) return;

    const navigationTarget = document.createElement('button');
    navigationTarget.dataset.targetId = id;
    navigationTarget.classList.add('navigation-target');

    const icon = document.createElement('span');
    icon.classList.add('icon');
    icon.style.maskImage = `url(${iconUrl}`;
    navigationTarget.appendChild(icon);

    const label = document.createElement('span');
    label.classList.add('label');
    label.textContent = labelText;
    navigationTarget.appendChild(label);

    targetsElement.appendChild(navigationTarget);
    navigationTarget.addEventListener('click', () => {
      this.onTargetClicked.dispatch(navigationTarget.dataset.targetId ?? id);
    });
  }

  public selectTarget(id: string) {
    if (!this.shadowRoot) return;
    const targets = this.shadowRoot.querySelectorAll('.navigation-target');
    for (const target of targets) {
      if (!(target instanceof HTMLElement)) continue;
      if (target.dataset.targetId === id) {
        target.classList.add('selected');
      } else {
        target.classList.remove('selected');
      }
    }
  }

  public setTooltipForTarget(id: string, tooltip: string) {
    if (!this.shadowRoot) return;
    const targets = [... this.shadowRoot.querySelectorAll('.navigation-target')] as HTMLButtonElement[];
    for (const target of targets) {
      if (!(target instanceof HTMLElement)) continue;
      if (target.dataset.targetId === id) {
        target.title = tooltip;
      }
    }
  }
}

customElements.define('ctg-bottom-navigation', CtgBottomNavigationElement);
