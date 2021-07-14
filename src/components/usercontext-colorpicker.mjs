// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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

const COLORS = [
  "blue",
  "turquoise",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "toolbar",
];

customElements.define('usercontext-colorpicker', class ColorPickerElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/components/usercontext.css';
    this.shadowRoot.append(css);
    const radios = document.createElement('form');
    this.shadowRoot.append(radios);
    radios.id = 'radios';
    let count = 0;
    for (const color of COLORS) {
      const colorName = color == 'toolbar' ? 'grey' : color;
      const radio = document.createElement('input');
      radios.append(radio);
      radio.type = 'radio';
      radio.name = 'color';
      radio.id = color;
      radio.value = color;
      if (count < 1) {
        radio.checked = true;
      }
      const label = document.createElement('label');
      radios.append(label);
      label.htmlFor = color;
      label.classList.add('usercontext-icon');
      label.dataset.identityColor = colorName;
      label.dataset.identityIcon = 'circle';
      count++;
    }
  }

  get value() {
    return this.shadowRoot.querySelector('#radios').color.value;
  }

  set value(value) {
    this.shadowRoot.querySelector('#radios').color.value = value;
  }
});
