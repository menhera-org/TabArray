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
import { CookieStore, DisplayedContainer } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';

import { ContainerTabOpenerService } from '../../../lib/tabGroups/ContainerTabOpenerService';
import { TabQueryService } from '../../../lib/tabs/TabQueryService';
import { TabService } from '../../../lib/tabs/TabService';
import { TabAttributeMap } from '../../../lib/tabGroups/TabAttributeMap';

import { MenulistTabElement } from "../../../components/menulist-tab";
import { MenulistContainerElement } from "../../../components/menulist-container";
import { MenulistTagElement } from '../../../components/menulist-tag';


import * as containers from '../../../legacy-lib/modules/containers';
import { IndexTab } from "../../../legacy-lib/modules/IndexTab";
import { ContainerVisibilityService } from '../../../lib/tabGroups/ContainerVisibilityService';

import { PopupModalRenderer } from './PopupModalRenderer';
import { PopupCurrentWindowRenderer } from "./PopupCurrentWindowRenderer";

enum ContainerTabsState {
  NO_TABS,
  HIDDEN_TABS,
  VISIBLE_TABS,
}

// This needs some refactoring.
export class PopupRenderer {
  private readonly _containerVisibilityService = ContainerVisibilityService.getInstance();
  private readonly _containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
  private readonly _tabQueryService = TabQueryService.getInstance();
  private readonly _tabService = TabService.getInstance();

  public readonly currentWindowRenderer = new PopupCurrentWindowRenderer(this);
  public readonly modalRenderer = new PopupModalRenderer(this);

  public renderTab(tab: CompatTab, userContext: DisplayedContainer): MenulistTabElement {
    const element = new MenulistTabElement(tab, userContext);
    element.onTabClicked.addListener(() => {
      tab.focus();
    });
    element.onClose.addListener(() => {
      tab.close();
    });
    element.onPin.addListener(() => {
      tab.pin();
    });
    element.onUnpin.addListener(() => {
      tab.unpin();
    });
    return element;
  }

  private createContainerElement(userContext: DisplayedContainer, isPrivate = false): MenulistContainerElement {
    const element = new MenulistContainerElement(userContext, isPrivate);

    element.onContainerOptionsClick.addListener(async () => {
      this.modalRenderer.showContainerOptionsPanelAsync(userContext, isPrivate);
    });

    return element;
  }

  public renderPartialContainerElement(userContext: DisplayedContainer, isPrivate = false): MenulistContainerElement {
    const element = this.createContainerElement(userContext, isPrivate);
    element.containerVisibilityToggleButton.disabled = true;
    element.partialContainerView = true;
    return element;
  }

  private defineContainerCloseListenerForWindow(element: MenulistContainerElement, windowId: number, userContext: DisplayedContainer): void {
    element.onContainerClose.addListener(() => {
      console.log('Closing all unpinned tabs of window %d in cookie store %s', windowId, userContext.cookieStore.id);
      containers.closeAllTabsOnWindow(userContext.cookieStore.id, windowId).catch((e) => {
        console.error(e);
      });
    });
  }

  public renderContainerForFirstPartyDomain(domain: string, userContext: DisplayedContainer, isPrivateBrowsing = false): MenulistContainerElement {
    const element = this.renderPartialContainerElement(userContext, isPrivateBrowsing);
    const cookieStoreId = isPrivateBrowsing ? CookieStore.PRIVATE.id : userContext.cookieStore.id;
    element.onContainerClose.addListener(() => {
      this._tabQueryService.queryTabs({
        tabGroupId: cookieStoreId,
        registrableDomain: domain,
      }).then((tabs) => {
        return this._tabService.closeTabs(tabs);
      }).catch((e) => {
        console.error(e);
      });
    });
    // console.debug('element.containerVisibilityToggleButton.disabled', element.containerVisibilityToggleButton.disabled);
    return element;
  }

  private renderContainer(windowId: number, userContext: DisplayedContainer, isPrivate = false): MenulistContainerElement {
    const cookieStoreId = isPrivate ? CookieStore.PRIVATE.id : userContext.cookieStore.id;
    const element = this.createContainerElement(userContext, isPrivate);
    this.defineContainerCloseListenerForWindow(element, windowId, userContext);
    element.onContainerHide.addListener(() => {
      this._containerVisibilityService.hideContainerOnWindow(windowId, cookieStoreId).catch(() => {
        // ignore. (errors for private windows)
      });
    });
    element.onContainerUnhide.addListener(() => {
      this._containerVisibilityService.showContainerOnWindow(windowId, cookieStoreId).catch(() => {
        // ignore. (errors for private windows)
      });
    });
    element.onContainerClick.addListener(async () => {
      await this._containerTabOpenerService.openNewTabInContainer(cookieStoreId, true, windowId);
    });
    return element;
  }

  public renderContainerWithTabs(windowId: number, userContext: DisplayedContainer, tabs: CompatTab[], isPrivate = false, tabAttributeMap?: TabAttributeMap): MenulistContainerElement {
    if (isPrivate && !userContext.cookieStore.isPrivate) {
      throw new Error('Cannot render container with tabs for private window with non-private container');
    }
    if (tabAttributeMap) {
      tabs.sort((a, b) => {
        const aTag = tabAttributeMap.getTagForTab(a.id)?.tagId ?? 0;
        const bTag = tabAttributeMap.getTagForTab(b.id)?.tagId ?? 0;
        return aTag - bTag;
      });
    }

    const element = this.renderContainer(windowId, userContext, isPrivate);
    let tabCount = 0;
    let state = ContainerTabsState.NO_TABS;
    let tagId = 0;
    for (const tab of tabs) {
      if (IndexTab.isIndexTabUrl(tab.url)) {
        continue;
      }
      tabCount++;
      if (tab.hidden) {
        state = ContainerTabsState.HIDDEN_TABS;
        continue;
      }

      if (tabAttributeMap) {
        const newTag = tabAttributeMap.getTagForTab(tab.id)?.tagId ?? 0;
        if (tagId != newTag) {
          tagId = newTag;
          const tag = tabAttributeMap.getTagForTab(tab.id);
          if (tag) {
            const tagElement = new MenulistTagElement(tag);
            element.appendChild(tagElement);
          }
        }
      }

      const tabElement = this.renderTab(tab, userContext);
      tabElement.draggable = true;
      tabElement.addEventListener('dragstart', (ev) => {
        if (!ev.dataTransfer) return;
        ev.dataTransfer.setData('application/json', JSON.stringify({
          type: 'tab',
          id: tab.id,
          index: tab.index,
          pinned: tab.pinned,
          cookieStoreId: tab.cookieStore.id,
        }));
        ev.dataTransfer.dropEffect = 'move';
      });
      tabElement.addEventListener('dragover', (ev) => {
        if (!ev.dataTransfer) return;
        const json = ev.dataTransfer.getData('application/json');
        const data = JSON.parse(json);
        if ('tab' != data.type || data.pinned) return;
        if (data.cookieStoreId != tab.cookieStore.id) return;
        ev.preventDefault();
      });
      tabElement.addEventListener('drop', (ev) => {
        if (!ev.dataTransfer) return;
        const json = ev.dataTransfer.getData('application/json');
        const data = JSON.parse(json);
        if ('tab' != data.type || data.pinned) return;
        if (data.cookieStoreId != tab.cookieStore.id) return;
        ev.preventDefault();
        browser.tabs.move(data.id, { index: tab.index }).catch((e) => {
          console.error(e);
        });
      });
      element.appendChild(tabElement);
      state = ContainerTabsState.VISIBLE_TABS;
    }
    if (state === ContainerTabsState.HIDDEN_TABS) {
      element.containerHidden = true;
    }
    element.tabCount = tabCount;
    element.addEventListener('dragover', (ev) => {
      if (!ev.dataTransfer) return;
      const json = ev.dataTransfer.getData('application/json');
      const data = JSON.parse(json);
      if ('tab' != data.type || data.pinned) return;
      if (data.cookieStoreId == userContext.cookieStore.id) return;
      ev.preventDefault();
    });
    element.addEventListener('drop', (ev) => {
      if (!ev.dataTransfer) return;
      const json = ev.dataTransfer.getData('application/json');
      const data = JSON.parse(json);
      if ('tab' != data.type || data.pinned) return;
      if (data.cookieStoreId == userContext.cookieStore.id) return;
      ev.preventDefault();
      this._containerTabOpenerService.reopenTabInContainer(data.id, userContext.cookieStore.id, false).catch((e) => {
        console.error(e);
      });
    });
    return element;
  }
}
