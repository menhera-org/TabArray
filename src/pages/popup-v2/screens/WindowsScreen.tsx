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

import { CompatConsole } from '../../../lib/console/CompatConsole';
import { ContainerVisibilityService } from '../../../lib/tabGroups/ContainerVisibilityService';
import { ContainerTabOpenerService } from '../../../lib/tabGroups/ContainerTabOpenerService';
import { TemporaryContainerService } from '../../../lib/tabGroups/TemporaryContainerService';
import { SupergroupService } from '../../../lib/tabGroups/SupergroupService';
import { TagService } from '../../../lib/tabGroups/tags/TagService';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';
import { WindowsView, WindowsHandlers } from '../views/WindowsView';
import { MenuItem } from '../../../frontend/frame/MenuItem';
import { browserTabActions } from '../views/tabActions';
import { PopupUtils } from '../PopupUtils';

import { ScreenProps, logError, dialogs } from './common';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const popupUtils = new PopupUtils();
const containerVisibilityService = ContainerVisibilityService.getInstance();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const supergroupService = SupergroupService.getInstance();

const handlers: WindowsHandlers = {
  tabActions: browserTabActions,
  collapseAll: (windowId) => {
    containerVisibilityService.hideAllOnWindow(windowId).catch(logError);
  },
  expandAll: (windowId) => {
    containerVisibilityService.showAllOnWindow(windowId).catch(logError);
  },
  closeWindow: async (windowId) => {
    // In the sidebar this button looks like "close sidebar", and closing the last window quits Firefox (#508).
    const confirmed = await dialogs.confirmAsync(browser.i18n.getMessage('confirmWindowClose'));
    if (!confirmed) return;
    browser.windows.remove(windowId).catch(logError);
  },
  createTag: () => {
    dialogs.showTagEditor();
  },
  createGroup: () => {
    dialogs.showSupergroupEditor();
  },
  createContainer: () => {
    dialogs
      .showNewContainerPanelAsync()
      .then((result) => {
        if (result) console.log('Created new container', result);
      })
      .catch(logError);
  },
  createTemporaryContainer: () => {
    TemporaryContainerService.getInstance().createTemporaryContainer().catch(logError);
  },
  openTabInContainer: (container, windowId, tagId) => {
    containerTabOpenerService.openNewTabInContainer(container.cookieStore.id, true, windowId, tagId).catch(logError);
  },
  closeContainer: (container, windowId) => {
    const cookieStoreId = container.cookieStore.id;
    console.log('Closing all unpinned tabs of window %d in cookie store %s', windowId, cookieStoreId);
    containerVisibilityService.closeContainerOnWindow(windowId, cookieStoreId).catch(logError);
  },
  containerOptions: (container, isPrivate) => {
    dialogs.showContainerOptionsPanelAsync(container, isPrivate).catch(logError);
  },
  hideContainer: (container, windowId) => {
    containerVisibilityService.hideContainerOnWindow(windowId, container.cookieStore.id).catch(() => {
      // ignore. (errors for private windows)
    });
  },
  showContainer: (container, windowId) => {
    containerVisibilityService.showContainerOnWindow(windowId, container.cookieStore.id).catch(() => {
      // ignore. (errors for private windows)
    });
  },
  focusContainer: (container, windowId) => {
    containerVisibilityService
      .focusContainerOnWindow(windowId, container.cookieStore.id)
      .then(() => containerVisibilityService.hideAllOnWindow(windowId))
      .catch(logError);
  },
  reopenTabInContainer: (tabId, container) => {
    containerTabOpenerService.reopenTabInContainer(tabId, container.cookieStore.id, false).catch(logError);
  },
  editTag: (tag) => {
    dialogs.showTagEditor(tag);
  },
  deleteTag: (tag) => {
    TagService.getInstance().deleteTag(tag.tagId).catch(logError);
  },
  hideSupergroup: (tabGroupId, windowId) => {
    supergroupService.hideSupergroupOnWindow(tabGroupId, windowId).catch(logError);
  },
  showSupergroup: (tabGroupId, windowId) => {
    supergroupService.showSupergroupOnWindow(tabGroupId, windowId).catch(logError);
  },
  closeSupergroup: (tabGroupId, windowId) => {
    supergroupService.closeUnpinnedSupergroupTabsOnWindow(tabGroupId, windowId).catch(logError);
  },
  supergroupOptions: (supergroup) => {
    dialogs.showSupergroupOptions(supergroup);
  },
};

export const WindowsScreen = ({ browserState, active }: ScreenProps) => (
  <>
    <ScreenTopBar
      active={active}
      heading={browser.i18n.getMessage('windowsN', browserState.windowIds.length.toFixed(0))}
    >
      <MenuItem icon="/img/firefox-icons/plus.svg" label="buttonNewWindow" iconOnly>
        <MenuItem
          icon="/img/firefox-icons/plus.svg"
          label="buttonNewWindow"
          onClick={() => popupUtils.openNewWindow(false)}
        />
        {browserState.enabledInPrivateBrowsing && (
          <MenuItem
            icon="/img/firefox-icons/private-browsing-icon.svg"
            iconInColor
            label="buttonNewPrivateWindow"
            onClick={() => popupUtils.openNewWindow(true)}
          />
        )}
      </MenuItem>
    </ScreenTopBar>
    <WindowsView browserState={browserState} handlers={handlers} active={active} />
  </>
);
