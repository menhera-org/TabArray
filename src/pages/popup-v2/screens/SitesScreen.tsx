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

import browser from 'webextension-polyfill';

import { TabQueryService } from '../../../lib/tabs/TabQueryService';
import { CompatConsole } from '../../../lib/console/CompatConsole';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';
import { SitesView, getSiteSummaries } from '../views/SitesView';

import { ScreenProps, logError } from './common';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

const closeSite = async (domain: string) => {
  const tabs = await TabQueryService.getInstance().queryTabs({ registrableDomain: domain });
  const tabIds = tabs.map((tab) => tab.id);
  console.info(`Closing ${tabIds.length} tabs for ${domain}...`);
  await browser.tabs.remove(tabIds);
};

export const SitesScreen = ({
  browserState,
  active,
  onSiteClick,
}: ScreenProps & {
  onSiteClick: (domain: string) => void;
}) => (
  <>
    <ScreenTopBar
      active={active}
      heading={browser.i18n.getMessage('sitesN', Object.keys(browserState.tabIdsBySite).length.toFixed(0))}
    />
    <SitesView
      sites={getSiteSummaries(browserState)}
      onSiteClick={onSiteClick}
      onSiteClose={(domain) => closeSite(domain).catch(logError)}
    />
  </>
);
