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

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { CtgFragmentElement } from "../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../components/ctg/ctg-top-bar";
import browser from "webextension-polyfill";
import { PopupUtils } from "../../popup/PopupUtils";
import { HelpBannerElement } from "../../components/help-banner";

export class HelpFragmentBuilder extends AbstractFragmentBuilder {
  private readonly _popupUtils = new PopupUtils();

  public getFragmentId(): string {
    return 'fragment-help';
  }

  public getLabelText(): string {
    return browser.i18n.getMessage('menuItemHelp');
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/help.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();

    const helpBanner = new HelpBannerElement();
    fragment.appendChild(helpBanner);

    fragment.appendChild(document.createElement('hr'));

    const helpSettings = document.createElement('div');
    helpSettings.classList.add('help-settings');
    fragment.appendChild(helpSettings);

    const fpiDescription = document.createElement('p');
    fpiDescription.textContent = browser.i18n.getMessage('fpiDescription');
    helpSettings.appendChild(fpiDescription);

    const fpiParagraph = document.createElement('p');
    fpiParagraph.classList.add('browser-style');
    helpSettings.appendChild(fpiParagraph);

    const inputFirstPartyIsolate = document.createElement('input');
    inputFirstPartyIsolate.type = 'checkbox';
    inputFirstPartyIsolate.id = 'input-firstPartyIsolate';
    fpiParagraph.appendChild(inputFirstPartyIsolate);

    const labelFirstPartyIsolate = document.createElement('label');
    labelFirstPartyIsolate.htmlFor = 'input-firstPartyIsolate';
    labelFirstPartyIsolate.textContent = browser.i18n.getMessage('labelFirstPartyIsolate');
    labelFirstPartyIsolate.classList.add('browser-style-label');
    fpiParagraph.appendChild(labelFirstPartyIsolate);

    const optionalFeaturesDescription = document.createElement('p');
    optionalFeaturesDescription.textContent = browser.i18n.getMessage('optionalFeaturesDescription');
    helpSettings.appendChild(optionalFeaturesDescription);

    const languageOverridesParagraph = document.createElement('p');
    languageOverridesParagraph.classList.add('browser-style');
    helpSettings.appendChild(languageOverridesParagraph);

    const inputFeatureLanguageOverrides = document.createElement('input');
    inputFeatureLanguageOverrides.type = 'checkbox';
    inputFeatureLanguageOverrides.id = 'input-featureLanguageOverrides';
    languageOverridesParagraph.appendChild(inputFeatureLanguageOverrides);

    const labelFeatureLanguageOverrides = document.createElement('label');
    labelFeatureLanguageOverrides.htmlFor = 'input-featureLanguageOverrides';
    labelFeatureLanguageOverrides.textContent = browser.i18n.getMessage('featureLanguageOverrides');
    labelFeatureLanguageOverrides.classList.add('browser-style-label');
    languageOverridesParagraph.appendChild(labelFeatureLanguageOverrides);

    const uaOverridesParagraph = document.createElement('p');
    uaOverridesParagraph.classList.add('browser-style');
    helpSettings.appendChild(uaOverridesParagraph);

    const inputFeatureUaOverrides = document.createElement('input');
    inputFeatureUaOverrides.type = 'checkbox';
    inputFeatureUaOverrides.id = 'input-featureUaOverrides';
    uaOverridesParagraph.appendChild(inputFeatureUaOverrides);

    const labelFeatureUaOverrides = document.createElement('label');
    labelFeatureUaOverrides.htmlFor = 'input-featureUaOverrides';
    labelFeatureUaOverrides.textContent = browser.i18n.getMessage('featureUaOverrides');
    labelFeatureUaOverrides.classList.add('browser-style-label');
    uaOverridesParagraph.appendChild(labelFeatureUaOverrides);

    const modalActions = document.createElement('div');
    modalActions.classList.add('modal-actions');
    fragment.appendChild(modalActions);

    const buttonGetStarted = document.createElement('button');
    buttonGetStarted.classList.add('button-default');
    buttonGetStarted.textContent = browser.i18n.getMessage('buttonGetStarted');
    modalActions.appendChild(buttonGetStarted);

    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.headingText = this.getLabelText();
  }
}
