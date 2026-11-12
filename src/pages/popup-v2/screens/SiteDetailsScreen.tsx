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

import { TabQueryService } from '../../../lib/tabs/TabQueryService';
import { TabService } from '../../../lib/tabs/TabService';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';
import { SiteDetailsView, getSiteTabs, getSiteTabsByContainer } from '../views/SiteDetailsView';
import { browserTabActions } from '../views/tabActions';

import { ScreenProps, logError, dialogs } from './common';

const closeSiteTabs = async (cookieStoreId: string, domain: string) => {
  const tabs = await TabQueryService.getInstance().queryTabs({ tabGroupId: cookieStoreId, registrableDomain: domain });
  await TabService.getInstance().closeTabs(tabs);
};

/** One site's tabs, by container. */
export const SiteDetailsScreen = ({ browserState, active, domain }: ScreenProps & { domain: string }) => (
  <>
    <ScreenTopBar active={active} heading={`${domain || '(null)'} (${getSiteTabs(browserState, domain).length})`} />
    <SiteDetailsView
      containers={getSiteTabsByContainer(browserState, domain)}
      tabActions={browserTabActions}
      onContainerClose={(container) => closeSiteTabs(container.cookieStore.id, domain).catch(logError)}
      onContainerOptions={(container) =>
        dialogs.showContainerOptionsPanelAsync(container, container.cookieStore.isPrivate).catch(logError)
      }
    />
  </>
);
