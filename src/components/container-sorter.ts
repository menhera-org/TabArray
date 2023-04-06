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

import browser from 'webextension-polyfill';
import { EventSink } from "weeg-events";
import { UserContext } from "../frameworks/tabGroups";
import { Uint32 } from "weeg-types";
import { CookieAutocleanService } from '../cookies/CookieAutocleanService';
import { LanguageSettings } from '../languages/LanguageSettings';

export class ContainerSorterElement extends HTMLElement {
  private readonly _cookieAutocleanService = CookieAutocleanService.getInstance();
  private readonly _languageSettings = LanguageSettings.getInstance();
  public readonly onChanged = new EventSink<Uint32.Uint32[]>();

  public constructor(userContexts: UserContext[], autocleanEnabledUserContextIds: Uint32.Uint32[] = []) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/container-sorter.css';
    this.shadowRoot.appendChild(styleSheet);

    const containersWrapperElement = document.createElement('div');
    containersWrapperElement.id = 'containers-wrapper';
    this.shadowRoot.appendChild(containersWrapperElement);

    const headerElement = document.createElement('div');
    headerElement.classList.add('header');
    containersWrapperElement.appendChild(headerElement);

    const headerContainerElement = document.createElement('div');
    headerContainerElement.classList.add('header-container');
    headerContainerElement.textContent = browser.i18n.getMessage('menuItemMain');
    headerElement.appendChild(headerContainerElement);

    const headerAutocleanElement = document.createElement('div');
    headerAutocleanElement.classList.add('header-autoclean');
    headerAutocleanElement.textContent = browser.i18n.getMessage('enableCookiesAutoclean');
    headerElement.appendChild(headerAutocleanElement);

    const containersElement = document.createElement('div');
    containersElement.id = 'containers';
    containersWrapperElement.appendChild(containersElement);

    this.setUserContexts(userContexts, autocleanEnabledUserContextIds);
  }

  private get containersElement(): HTMLDivElement {
    const element = this.shadowRoot?.getElementById('containers');
    if (!element) {
      throw new Error('Containers element is null');
    }
    return element as HTMLDivElement;
  }

  private createOptionsElement(userContext: UserContext, autocleanEnabled = false): HTMLDivElement {
    const options = document.createElement('div');
    options.classList.add('options');
    options.classList.add('browser-style');
    const autocleanCheckbox = document.createElement('input');
    autocleanCheckbox.type = 'checkbox';
    autocleanCheckbox.checked = autocleanEnabled;
    autocleanCheckbox.addEventListener('change', () => {
      if (autocleanCheckbox.checked) {
        this._cookieAutocleanService.enableAutocleanForUserContext(userContext.id);
      } else {
        this._cookieAutocleanService.disableAutocleanForUserContext(userContext.id);
      }
    });
    options.appendChild(autocleanCheckbox);
    return options;
  }

  private renderUserContext(userContext: UserContext, autocleanEnabled = false): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('container');
    // element.draggable = true;
    element.dataset.userContextId = userContext.id.toString();

    const iconElement = document.createElement('div');
    iconElement.classList.add('icon');
    iconElement.style.mask = `url(${userContext.iconUrl}) center center / 75% no-repeat`;
    iconElement.style.backgroundColor = userContext.colorCode;
    element.appendChild(iconElement);

    const nameElement = document.createElement('div');
    nameElement.classList.add('name');
    nameElement.textContent = userContext.name;
    element.appendChild(nameElement);

    const upButton = document.createElement('button');
    upButton.classList.add('up');
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

    const options = this.createOptionsElement(userContext, autocleanEnabled);
    element.appendChild(options);

    return element;
  }

  public setUserContexts(userContexts: UserContext[], autocleanEnabledUserContextIds: Uint32.Uint32[] = []) {
    const containersElement = this.containersElement;
    containersElement.textContent = '';
    for (const userContext of userContexts) {
      containersElement.appendChild(this.renderUserContext(userContext, autocleanEnabledUserContextIds.includes(userContext.id)));
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
