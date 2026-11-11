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

import { ContainerTabOpenerService } from '../../../lib/tabGroups/ContainerTabOpenerService';
import { DisplayedContainerDao } from '../../../lib/states/DisplayedContainerDao';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';
import { ContainerDetailsView, getContainerTabsByWindow } from '../views/ContainerDetailsView';
import { MenuItem } from '../../../frontend/frame/MenuItem';
import { browserTabActions } from '../views/tabActions';

import { ScreenProps, logError } from './common';

const openNewTab = (cookieStoreId: string) => {
  ContainerTabOpenerService.getInstance<ContainerTabOpenerService>()
    .openNewTabInContainer(cookieStoreId, true)
    .catch(logError);
};

/** One container's tabs, by window. Shows nothing for a container that no longer exists. */
export const ContainerDetailsScreen = ({
  browserState,
  active,
  cookieStoreId,
}: ScreenProps & {
  cookieStoreId: string;
}) => {
  const dao = browserState.displayedContainers.find((c) => c.cookieStoreId == cookieStoreId);
  const container = dao && DisplayedContainerDao.toDisplayedContainer(dao);
  return (
    <>
      <ScreenTopBar active={active} heading={container?.name ?? browser.i18n.getMessage('noContainer')}>
        <MenuItem
          icon="/img/firefox-icons/plus.svg"
          label="buttonOpenTabInContainer"
          iconOnly
          onClick={() => openNewTab(cookieStoreId)}
        />
      </ScreenTopBar>
      {container && (
        <ContainerDetailsView
          container={container}
          windows={getContainerTabsByWindow(browserState, cookieStoreId)}
          tabActions={browserTabActions}
        />
      )}
    </>
  );
};
