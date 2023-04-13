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

export type CtgMenuItemIconMode = 'normal' | 'masked';
export type CtgMenuItemDisplayStyle = 'normal' | 'icon';

export class CtgMenuItemElement extends HTMLElement {
  private _iconMode = 'masked' as CtgMenuItemIconMode;
  private _iconSrc = '/img/firefox-icons/defaultFavicon.svg';
  private _displayStyle = 'normal' as CtgMenuItemDisplayStyle;
  private _bodyOnClick: () => void;

  static get disabledFeatures() {
    return [];
  }

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/ctg/ctg-menu-item.css';
    this.shadowRoot.appendChild(styleSheet);

    const button = document.createElement('button');
    button.id = 'button';
    this.shadowRoot.appendChild(button);

    const icon = document.createElement('span');
    icon.id = 'icon';
    button.appendChild(icon);

    const label = document.createElement('span');
    label.id = 'label';
    button.appendChild(label);

    const menuItems = document.createElement('div');
    menuItems.id = 'menu-items';
    this.shadowRoot.appendChild(menuItems);
    menuItems.hidden = true;

    const slot = document.createElement('slot');
    menuItems.appendChild(slot);

    button.addEventListener('click', () => {
      this.broadcastClickEvent();
      if (this.children.length > 0) {
        menuItems.hidden = !menuItems.hidden;
        if (!menuItems.hidden) {
          // const rect = button.getBoundingClientRect();
          // menuItems.style.left = `${rect.left}px`;
          // menuItems.style.top = `${rect.bottom}px`;
          menuItems.style.insetInlineEnd = `${-(window.innerWidth - (this.offsetLeft + this.offsetWidth))}px`;
          menuItems.style.maxInlineSize = window.innerWidth + 'px';
        }
      } else {
        this.closeMenu();
      }
    });

    this._bodyOnClick = () => {
      this.closeMenu();
    };

    this.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    document.body.addEventListener('ctg-menu-item-click', (event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.element !== this) {
        this.closeMenu();
      }
    });

    this._renderIcon();
  }

  public closeMenu() {
    const menuItems = this.shadowRoot?.getElementById('menu-items');
    if (!menuItems) return;
    menuItems.hidden = true;
  }

  public broadcastClickEvent() {
    document.body.dispatchEvent(new CustomEvent('ctg-menu-item-click', {
      detail: {
        element: this,
      },
    }));
  }

  public connectedCallback() {
    document.body.addEventListener('click', this._bodyOnClick);
  }

  public disconnectedCallback() {
    // prevent memory leak
    document.body.removeEventListener('click', this._bodyOnClick);
  }

  private _getIconMask(): string {
    return `url(${this.iconSrc}) center / 75% no-repeat`;
  }

  private _getIconBackgroundImage(): string {
    return `url(${this.iconSrc})`;
  }

  private _renderIcon() {
    const iconMode = this.iconMode;
    const icon = this.shadowRoot?.getElementById('icon');
    if (!icon) return;
    if (iconMode === 'masked') {
      icon.style.mask = this._getIconMask();
      icon.classList.add('masked');
    } else {
      icon.style.mask = '';
      icon.style.backgroundImage = this._getIconBackgroundImage();
      icon.classList.remove('masked');
    }
  }

  public set iconSrc(value: string) {
    this._iconSrc = value;
    this._renderIcon();
  }

  public get iconSrc(): string {
    return this._iconSrc;
  }

  public get iconMode(): CtgMenuItemIconMode {
    return this._iconMode;
  }

  public set iconMode(value: CtgMenuItemIconMode) {
    this._iconMode = value;
    this._renderIcon();
  }

  public get labelText(): string {
    return this.shadowRoot?.querySelector('#label')?.textContent || '';
  }

  public set labelText(value: string) {
    this.title = value;
    const label = this.shadowRoot?.querySelector('#label');
    if (!label) return;
    label.textContent = value;
  }

  public get displayStyle(): CtgMenuItemDisplayStyle {
    return this._displayStyle;
  }

  public set displayStyle(value: CtgMenuItemDisplayStyle) {
    this._displayStyle = value;
    const button = this.shadowRoot?.getElementById('button');
    const label = this.shadowRoot?.getElementById('label');
    if (!label || !button) return;
    if (value === 'icon') {
      label.hidden = true;
      button.classList.add('icon-only');
    } else {
      label.hidden = false;
      button.classList.remove('icon-only');
    }
  }
}

customElements.define('ctg-menu-item', CtgMenuItemElement);
