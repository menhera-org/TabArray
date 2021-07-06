// vim: ts=2 et ai

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
