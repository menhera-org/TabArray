// vim: ts=2 et ai

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

customElements.define('usercontext-iconpicker', class IconPickerElement extends HTMLElement {
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

  get value() {
    return this.shadowRoot.querySelector('#radios').icon.value;
  }

  set value(value) {
    this.shadowRoot.querySelector('#radios').icon.value = value;
  }
});
