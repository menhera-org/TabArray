/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

import { ExtensionPage, ExtensionPageService } from '../../lib/ExtensionPageService';
import { DebuggingInformationService } from '../../lib/DebuggingInformationService';
import { CompatConsole } from '../../lib/console/CompatConsole';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export type GlobalMenuAction = {
  id: string;
  /** i18n message name. */
  label: string;
  /** Without one, the menu item shows its default icon. */
  icon?: string;
  /** Draw the icon as it is, not as a mask in the text color. */
  iconInColor?: boolean;
  /** In the overflow menu rather than on the top bar. */
  overflow: boolean;
  run: () => void;
};

const open = (page: ExtensionPage) => () => ExtensionPageService.getInstance().openInBackground(page);

const saveDebuggingInformation = async () => {
  const debuggingInfo = await DebuggingInformationService.getInstance().getDebuggingInformation();
  const blob = new Blob([debuggingInfo], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ctg-debug-${Date.now()}.json`;
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

/** The menu items every screen of the popup (and the debugging page) shows, in order. */
export const getGlobalMenuActions = (isPopup: boolean): GlobalMenuAction[] => [
  {
    id: 'panorama-grid',
    label: 'panoramaGrid',
    icon: '/img/firefox-icons/top-sites.svg',
    overflow: false,
    run: open(ExtensionPageService.PANORAMA),
  },
  isPopup
    ? {
        id: 'open-sidebar',
        label: 'commandOpenSidebar',
        icon: '/img/firefox-icons/sidebars.svg',
        overflow: true,
        run: open(ExtensionPageService.SIDEBAR),
      }
    : {
        id: 'open-popup',
        label: 'commandOpenPopup',
        icon: '/img/firefox-icons/open-in-new.svg',
        overflow: true,
        run: open(ExtensionPageService.BROWSER_ACTION),
      },
  {
    id: 'view-cookies',
    label: 'tooltipCookies',
    icon: '/img/firefox-icons/cookies.svg',
    overflow: true,
    run: open(ExtensionPageService.COOKIES),
  },
  {
    id: 'debugging',
    label: 'debuggingInformation',
    icon: '/img/firefox-icons/developer.svg',
    overflow: true,
    run: open(ExtensionPageService.DEBUGGING),
  },
  {
    id: 'debugging-save',
    label: 'saveDebuggingInformation',
    icon: '/img/firefox-icons/download.svg',
    overflow: true,
    run: () => {
      saveDebuggingInformation().catch((e) => console.error(e));
    },
  },
  {
    id: 'addon-page',
    label: 'buttonAboutAddon',
    icon: '/icon.svg',
    iconInColor: true,
    overflow: true,
    run: open(ExtensionPageService.AMO),
  },
  { id: 'privacy-policy', label: 'privacyPolicy', overflow: true, run: open(ExtensionPageService.PRIVACY_POLICY) },
  {
    id: 'settings',
    label: 'buttonSettings',
    icon: '/img/firefox-icons/settings.svg',
    overflow: false,
    run: open(ExtensionPageService.OPTIONS),
  },
];
