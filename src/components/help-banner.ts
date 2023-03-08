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

import { PopupUtils } from "../popup/PopupUtils";
import browser from "webextension-polyfill";

export class HelpBannerElement extends HTMLElement {
  private readonly _popupUtils = new PopupUtils();

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/help-banner.css';
    this.shadowRoot.appendChild(styleSheet);

    const manifest = browser.runtime.getManifest();

    const helpBanner = document.createElement('div');
    helpBanner.classList.add('help-banner');
    this.shadowRoot.appendChild(helpBanner);

    const helpBannerImage = document.createElement('img');
    helpBannerImage.src = '/icon.svg';
    helpBannerImage.classList.add('help-banner-image');
    helpBanner.appendChild(helpBannerImage);

    const helpBannerHeading = document.createElement('h2');
    helpBannerHeading.classList.add('help-banner-heading');
    helpBannerHeading.textContent = manifest.name;
    helpBanner.appendChild(helpBannerHeading);

    const helpBannerVersion = document.createElement('p');
    helpBannerVersion.textContent = manifest.version;
    helpBanner.appendChild(helpBannerVersion);

    const helpBannerDescription = document.createElement('p');
    helpBannerDescription.textContent = manifest.description ?? '';
    helpBanner.appendChild(helpBannerDescription);

    const helpBannerParagraph1 = document.createElement('p');
    helpBanner.appendChild(helpBannerParagraph1);

    const helpBannerAmoLink = document.createElement('a');
    helpBannerAmoLink.href = '#';
    helpBannerAmoLink.textContent = browser.i18n.getMessage('buttonAboutAddon');
    helpBannerParagraph1.appendChild(helpBannerAmoLink);

    helpBannerAmoLink.addEventListener('click', (ev) => {
      ev.preventDefault();
      this._popupUtils.openAddonPage();
    });

    const helpBannerParagraph2 = document.createElement('p');
    helpBanner.appendChild(helpBannerParagraph2);

    const helpBannerPrivacyPolicyLink = document.createElement('a');
    helpBannerPrivacyPolicyLink.href = '#';
    helpBannerPrivacyPolicyLink.textContent = browser.i18n.getMessage('privacyPolicy');
    helpBannerParagraph2.appendChild(helpBannerPrivacyPolicyLink);

    helpBannerPrivacyPolicyLink.addEventListener('click', (ev) => {
      ev.preventDefault();
      this._popupUtils.openPrivacyPolicyPage();
    });

  }
}

customElements.define('help-banner', HelpBannerElement);
