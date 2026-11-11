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

import { TemporaryContainerService } from '../../../lib/tabGroups/TemporaryContainerService';
import { SupergroupService } from '../../../lib/tabGroups/SupergroupService';
import { TabQueryService } from '../../../lib/tabs/TabQueryService';
import { TabService } from '../../../lib/tabs/TabService';

import { ScreenTopBar } from '../app/TopBar';
import { ContainersView, getContainerTree } from '../views/ContainersView';
import { MenuItem } from '../views/MenuItem';

import { CompatConsole } from '../../../lib/console/CompatConsole';

import { ScreenProps, logError, modalRenderer } from './common';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

const closeContainerTabs = async (cookieStoreId: string) => {
  const tabs = await TabQueryService.getInstance().queryTabs({ tabGroupId: cookieStoreId, pinned: false });
  await TabService.getInstance().closeTabs(tabs);
};

const createContainer = () => {
  modalRenderer
    .showNewContainerPanelAsync()
    .then((result) => {
      if (result) console.log('Created new container', result);
    })
    .catch(logError);
};

const createTemporaryContainer = () => {
  TemporaryContainerService.getInstance()
    .createTemporaryContainer()
    .then((identity) => console.debug('Created temporary container', identity))
    .catch(logError);
};

export const ContainersScreen = ({
  browserState,
  active,
  onContainerClick,
}: ScreenProps & {
  onContainerClick: (cookieStoreId: string) => void;
}) => (
  <>
    <ScreenTopBar
      active={active}
      // TODO: add i18n string
      heading={`${browser.i18n.getMessage('menuItemMain')} (${browserState.displayedContainers.length.toFixed(0)})`}
    >
      <MenuItem icon="/img/firefox-icons/plus.svg" label="buttonNewContainer" iconOnly>
        <MenuItem icon="/img/firefox-icons/plus.svg" label="buttonNewContainer" onClick={createContainer} />
        <MenuItem
          icon="/img/material-icons/timelapse.svg"
          label="buttonNewTemporaryContainer"
          onClick={createTemporaryContainer}
        />
      </MenuItem>
    </ScreenTopBar>
    <ContainersView
      nodes={getContainerTree(browserState)}
      onContainerClick={(container) => onContainerClick(container.cookieStore.id)}
      onContainerClose={(container) => closeContainerTabs(container.cookieStore.id).catch(logError)}
      onContainerOptions={(container) =>
        modalRenderer.showContainerOptionsPanelAsync(container, container.cookieStore.isPrivate).catch(logError)
      }
      onSupergroupClose={(tabGroupId) =>
        SupergroupService.getInstance().closeUnpinnedSupergroupTabs(tabGroupId).catch(logError)
      }
      onSupergroupOptions={(supergroup) => modalRenderer.showSupergroupOptions(supergroup)}
    />
  </>
);
