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

import browser from "webextension-polyfill";

import { ExtensionPageService } from "../../lib/ExtensionPageService";

import { CtgDrawerElement } from "../../components/ctg/ctg-drawer";
import { CtgTopBarElement } from "../../components/ctg/ctg-top-bar";
import { CtgMenuItemElement } from "../../components/ctg/ctg-menu-item";

const extensionPageService = ExtensionPageService.getInstance();

export class GlobalMenuItems {
  public defineTopBarMenuItems(topBarElement: CtgTopBarElement) {
    const panoramaGridMenuItem = new CtgMenuItemElement();
    panoramaGridMenuItem.labelText = browser.i18n.getMessage('panoramaGrid');
    panoramaGridMenuItem.iconSrc = '/img/firefox-icons/top-sites.svg';
    topBarElement.addMenuItem('panorama-grid', panoramaGridMenuItem);

    if (document.body.classList.contains('popup')) {
      const openSidebarMenuItem = new CtgMenuItemElement();
      openSidebarMenuItem.labelText = browser.i18n.getMessage('commandOpenSidebar');
      openSidebarMenuItem.iconSrc = '/img/firefox-icons/sidebars.svg';
      topBarElement.addOverflowMenuItem('open-sidebar', openSidebarMenuItem);
      topBarElement.removeOverflowMenuItem('open-popup');
    } else {
      const openPopupMenuItem = new CtgMenuItemElement();
      openPopupMenuItem.labelText = browser.i18n.getMessage('commandOpenPopup');
      openPopupMenuItem.iconSrc = '/img/firefox-icons/open-in-new.svg';
      topBarElement.addOverflowMenuItem('open-popup', openPopupMenuItem);
      topBarElement.removeOverflowMenuItem('open-sidebar');
    }

    const viewCookiesMenuItem = new CtgMenuItemElement();
    viewCookiesMenuItem.labelText = browser.i18n.getMessage('tooltipCookies');
    viewCookiesMenuItem.iconSrc = '/img/firefox-icons/cookies.svg';
    topBarElement.addOverflowMenuItem('view-cookies', viewCookiesMenuItem);

    const debuggingMenuItem = new CtgMenuItemElement();
    debuggingMenuItem.labelText = browser.i18n.getMessage('debuggingInformation');
    debuggingMenuItem.iconSrc = '/img/firefox-icons/developer.svg';
    topBarElement.addOverflowMenuItem('debugging', debuggingMenuItem);

    const addonPageMenuItem = new CtgMenuItemElement();
    addonPageMenuItem.labelText = browser.i18n.getMessage('buttonAboutAddon');
    addonPageMenuItem.iconSrc = '/icon.svg';
    addonPageMenuItem.iconMode = 'normal';
    topBarElement.addOverflowMenuItem('addon-page', addonPageMenuItem);

    const privacyPolicyMenuItem = new CtgMenuItemElement();
    privacyPolicyMenuItem.labelText = browser.i18n.getMessage('privacyPolicy');
    topBarElement.addOverflowMenuItem('privacy-policy', privacyPolicyMenuItem);

    const settingsMenuItem = new CtgMenuItemElement();
    settingsMenuItem.labelText = browser.i18n.getMessage('buttonSettings');
    settingsMenuItem.iconSrc = '/img/firefox-icons/settings.svg';
    topBarElement.addMenuItem('settings', settingsMenuItem);

    this.defineEventHandlers(topBarElement);
  }

  public defineDrawerMenuItems(drawerElement: CtgDrawerElement) {
    drawerElement;
    // not used
  }

  private defineEventHandlers(topbarElement: CtgTopBarElement) {
    const panoramaGridMenuItem  = topbarElement.getMenuItem('panorama-grid') as CtgMenuItemElement;
    panoramaGridMenuItem.addEventListener('click', () => {
      extensionPageService.openInBackground(ExtensionPageService.PANORAMA);
    });

    if (document.body.classList.contains('popup')) {
      const openSidebarMenuItem = topbarElement.getOverflowMenuItem('open-sidebar') as CtgMenuItemElement;
      openSidebarMenuItem.addEventListener('click', () => {
        extensionPageService.openInBackground(ExtensionPageService.SIDEBAR);
      });
    } else {
      const openPopupMenuItem = topbarElement.getOverflowMenuItem('open-popup') as CtgMenuItemElement;
      openPopupMenuItem.addEventListener('click', () => {
        extensionPageService.openInBackground(ExtensionPageService.BROWSER_ACTION);
      });
    }

    const viewCookiesMenuItem = topbarElement.getOverflowMenuItem('view-cookies') as CtgMenuItemElement;
    viewCookiesMenuItem.addEventListener('click', () => {
      extensionPageService.openInBackground(ExtensionPageService.COOKIES);
    });

    const debuggingMenuItem = topbarElement.getOverflowMenuItem('debugging') as CtgMenuItemElement;
    debuggingMenuItem.addEventListener('click', () => {
      extensionPageService.openInBackground(ExtensionPageService.DEBUGGING);
    });

    const addonPageMenuItem = topbarElement.getOverflowMenuItem('addon-page') as CtgMenuItemElement;
    addonPageMenuItem.addEventListener('click', () => {
      extensionPageService.openInBackground(ExtensionPageService.AMO);
    });

    const privacyPolicyMenuItem = topbarElement.getOverflowMenuItem('privacy-policy') as CtgMenuItemElement;
    privacyPolicyMenuItem.addEventListener('click', () => {
      extensionPageService.openInBackground(ExtensionPageService.PRIVACY_POLICY);
    });

    const settingsMenuItem = topbarElement.getMenuItem('settings') as CtgMenuItemElement;
    settingsMenuItem.addEventListener('click', () => {
      extensionPageService.openInBackground(ExtensionPageService.OPTIONS);
    });
  }
}
