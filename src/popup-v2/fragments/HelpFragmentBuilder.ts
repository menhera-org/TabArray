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

    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.headingText = this.getLabelText();
  }
}
