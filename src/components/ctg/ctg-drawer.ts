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

export class CtgDrawerElement extends HTMLElement {
  public readonly onShown = new EventSink<void>();
  public readonly onHidden = new EventSink<void>();

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/ctg/ctg-drawer.css';
    this.shadowRoot.appendChild(styleSheet);

    const scrim = document.createElement('div');
    scrim.id = 'scrim';
    this.shadowRoot.appendChild(scrim);

    scrim.addEventListener('click', () => {
      this.hide();
    });

    const main = document.createElement('div');
    main.id = 'main';
    this.shadowRoot.appendChild(main);

    const header = document.createElement('div');
    header.id = 'header';
    main.appendChild(header);

    const closeButton = document.createElement('button');
    closeButton.id = 'close-button';
    header.appendChild(closeButton);

    closeButton.addEventListener('click', () => {
      this.hide();
    });

    const heading = document.createElement('h2');
    heading.id = 'heading';
    header.appendChild(heading);

    const content = document.createElement('div');
    content.id = 'content';
    main.appendChild(content);

    const slot = document.createElement('slot');
    content.appendChild(slot);
  }

  public set heading(heading: string) {
    const headingElement = this.shadowRoot?.getElementById('heading');
    if (headingElement) {
      headingElement.textContent = heading;
    }
  }

  public get heading(): string {
    const headingElement = this.shadowRoot?.getElementById('heading');
    if (headingElement) {
      return headingElement.textContent || '';
    }
    return '';
  }

  public show(): void {
    this.hidden = false;
    this.onShown.dispatch();
  }

  public hide(): void {
    this.hidden = true;
    this.onHidden.dispatch();
  }
}

customElements.define('ctg-drawer', CtgDrawerElement);
