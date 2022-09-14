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

import { UserContext } from "../frameworks/tabGroups";
import { EventSink } from "../frameworks/utils";
import { Uint32 } from "../frameworks/types";

export class ContainerSorterElement extends HTMLElement {
  private static readonly TEMPLATE = `
    <link rel='stylesheet' href='/components/container-sorter.css'/>
    <div id='containers'></div>
  `;

  public readonly onChanged = new EventSink<Uint32.Uint32[]>();

  public constructor(userContexts: UserContext[]) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }
    this.shadowRoot.innerHTML = ContainerSorterElement.TEMPLATE;
    this.setUserContexts(userContexts);
  }

  private get containersElement(): HTMLDivElement {
    const element = this.shadowRoot?.getElementById('containers');
    if (!element) {
      throw new Error('Containers element is null');
    }
    return element as HTMLDivElement;
  }

  private renderUserContext(userContext: UserContext): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('container');
    element.dataset.userContextId = userContext.id.toString();

    const iconElement = document.createElement('div');
    iconElement.classList.add('icon');
    iconElement.style.mask = `url(${userContext.iconUrl}) center center / contain no-repeat`;
    iconElement.style.backgroundColor = userContext.color;
    element.appendChild(iconElement);

    const nameElement = document.createElement('div');
    nameElement.classList.add('name');
    nameElement.textContent = userContext.name;
    element.appendChild(nameElement);

    const upButton = document.createElement('button');
    upButton.classList.add('up');
    upButton.textContent = '↑';
    element.appendChild(upButton);
    upButton.addEventListener('click', () => {
      const parent = element.parentElement;
      const previous = element.previousElementSibling;
      if (!parent || !previous) {
        return;
      }
      parent.insertBefore(element, previous);
      this.onChanged.dispatch(this.getOrder());
    });

    const downButton = document.createElement('button');
    downButton.classList.add('down');
    downButton.textContent = '↓';
    element.appendChild(downButton);
    downButton.addEventListener('click', () => {
      const parent = element.parentElement;
      const next = element.nextElementSibling;
      if (!parent || !next) {
        return;
      }
      const nextNext = next.nextElementSibling;
      parent.insertBefore(element, nextNext);
      this.onChanged.dispatch(this.getOrder());
    });

    return element;
  }

  public setUserContexts(userContexts: UserContext[]) {
    const containersElement = this.containersElement;
    containersElement.textContent = '';
    for (const userContext of userContexts) {
      containersElement.appendChild(this.renderUserContext(userContext));
    }
  }

  public getOrder(): Uint32.Uint32[] {
    const order: Uint32.Uint32[] = [];
    for (const element of this.containersElement.children) {
      const id = (element as HTMLElement).dataset.userContextId;
      if (!id) {
        throw new Error('User context id is null');
      }
      order.push(Uint32.toUint32(parseInt(id, 10)));
    }
    return order;
  }
}

customElements.define('container-sorter', ContainerSorterElement);
