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

const ICONS = [
  "fingerprint",
  "briefcase",
  "dollar",
  "cart",
  "circle",
  "gift",
  "vacation",
  "food",
  "fruit",
  "pet",
  "tree",
  "chill",
  "fence",
];

export class IconPickerElement extends HTMLElement {
  private _radios: HTMLFormElement;

  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    if (!this.shadowRoot) {
      throw new Error('shadowRoot is null');
    }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/components/usercontext.css';
    this.shadowRoot.append(css);
    const radios = document.createElement('form');
    this._radios = radios;
    this.shadowRoot.append(radios);
    radios.id = 'radios';
    let count = 0;
    for (const icon of ICONS) {
      const radio = document.createElement('input');
      radios.append(radio);
      radio.type = 'radio';
      radio.name = 'icon';
      radio.id = icon;
      radio.value = icon;
      if (count < 1) {
        radio.checked = true;
      }
      const label = document.createElement('label');
      radios.append(label);
      label.htmlFor = icon;
      label.classList.add('usercontext-icon');
      label.dataset.identityColor = 'grey';
      label.dataset.identityIcon = icon;
      count++;
    }
  }

  get value(): string {
    return this._radios.icon.value;
  }

  set value(value: string) {
    if (!ICONS.includes(value)) {
      throw new Error(`Invalid icon: ${value}`);
    }
    this._radios.icon.value = value;
  }
}

customElements.define('usercontext-iconpicker', IconPickerElement);
