// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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

import browser from 'webextension-polyfill';
import { Tab, WindowService } from "../frameworks/tabs";
import { FirstPartyTabMap, UserContext, WindowUserContextList } from "../frameworks/tabGroups";
import { MenulistTabElement } from "../components/menulist-tab";
import { MenulistContainerElement } from "../components/menulist-container";
import * as containers from '../modules/containers.js';
import { OriginAttributes } from "../frameworks/tabGroups";
import { TabGroup } from "../frameworks/tabGroups";
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';
import { IndexTab } from "../modules/IndexTab";
import { PopupCurrentWindowRenderer } from "./PopupCurrentWindowRenderer";
import { PopupWindowListRenderer } from "./PopupWindowListRenderer";
import { PopupSiteListRenderer } from "./PopupSiteListRenderer";
import { Uint32 } from "../frameworks/types";
import { UserContextService } from '../userContexts/UserContextService';
import { PopupUtils } from './PopupUtils';
import { PromiseUtils } from '../frameworks/utils';
import { ColorPickerElement } from '../components/usercontext-colorpicker';
import { IconPickerElement } from '../components/usercontext-iconpicker';

enum ContainerTabsState {
  NO_TABS,
  HIDDEN_TABS,
  VISIBLE_TABS,
}

export type NewContainerPanelResult = {
  name: string;
  icon: string;
  color: string;
};

// This needs some refactoring.
export class PopupRenderer {
  private _userContextVisibilityService = UserContextVisibilityService.getInstance();
  private _userContextService = UserContextService.getInstance();
  public readonly currentWindowRenderer = new PopupCurrentWindowRenderer(this);
  public readonly windowListRenderer = new PopupWindowListRenderer(this);
  public readonly siteListRenderer = new PopupSiteListRenderer(this);
  private readonly _utils = new PopupUtils();

  public renderTab(tab: Tab, userContext: UserContext = UserContext.DEFAULT): MenulistTabElement {
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

  private createContainerElement(userContext: UserContext): MenulistContainerElement {
    userContext = this._userContextService.fillDefaultValues(userContext);
    const element = new MenulistContainerElement(userContext);
    element.onContainerEdit.addListener(async () => {
      this.showEditContainerPanelAsync(userContext).then((result) => {
        if (result == userContext) return;
        console.log('Container edited', result);
      });
    });
    element.onContainerDelete.addListener(async () => {
      this.confirmAsync(browser.i18n.getMessage('confirmContainerDelete', userContext.name)).then((result) => {
        if (!result) return;
        userContext.remove().catch((e) => {
          console.error(e);
        });
      });
    });
    return element;
  }

  private renderPartialContainerElement(userContext: UserContext = UserContext.DEFAULT): MenulistContainerElement {
    const element = this.createContainerElement(userContext);
    element.containerVisibilityToggleButton.disabled = true;
    return element;
  }

  private defineContainerCloseListenerForWindow(element: MenulistContainerElement, windowId: number, userContext: UserContext): void {
    element.onContainerClose.addListener(() => {
      containers.closeAllTabsOnWindow(userContext.id, windowId).catch((e) => {
        console.error(e);
      });
    });
  }

  public renderContainerForWindow(windowId: number, userContext: UserContext = UserContext.DEFAULT): MenulistContainerElement {
    const element = this.renderPartialContainerElement(userContext);
    this.defineContainerCloseListenerForWindow(element, windowId, userContext);
    return element;
  }

  public renderContainerForFirstPartyDomain(domain: string, userContext: UserContext = UserContext.DEFAULT, isPrivateBrowsing = false): MenulistContainerElement {
    const element = this.renderPartialContainerElement(userContext);
    element.onContainerClose.addListener(() => {
      const originAttributes = new OriginAttributes(domain, userContext.id, (isPrivateBrowsing ? 1 : 0) as Uint32.Uint32);
      TabGroup.createTabGroup(originAttributes).then((tabGroup) => {
        return tabGroup.tabList.closeTabs();
      }).catch((e) => {
        console.error(e);
      });
    });
    return element;
  }

  private renderContainer(windowId: number, userContext: UserContext): MenulistContainerElement {
    userContext = this._userContextService.fillDefaultValues(userContext);
    const element = this.createContainerElement(userContext);
    this.defineContainerCloseListenerForWindow(element, windowId, userContext);
    element.onContainerHide.addListener(async () => {
      await this._userContextVisibilityService.hideContainerOnWindow(windowId, userContext.id);
    });
    element.onContainerUnhide.addListener(async () => {
      await this._userContextVisibilityService.showContainerOnWindow(windowId, userContext.id);
    });
    element.onContainerClick.addListener(async () => {
      await containers.openNewTabInContainer(userContext.id, windowId);
      window.close();
    });
    return element;
  }

  public renderContainerWithTabs(windowId: number, userContext: UserContext, tabs: Tab[]): MenulistContainerElement {
    const element = this.renderContainer(windowId, userContext);
    let tabCount = 0;
    let state = ContainerTabsState.NO_TABS;
    for (const tab of tabs) {
      if (IndexTab.isIndexTabUrl(tab.url)) {
        continue;
      }
      tabCount++;
      if (tab.hidden) {
        state = ContainerTabsState.HIDDEN_TABS;
        continue;
      }

      element.appendChild(this.renderTab(tab, userContext));
      state = ContainerTabsState.VISIBLE_TABS;
    }
    if (state === ContainerTabsState.HIDDEN_TABS) {
      element.containerHidden = true;
    }
    element.tabCount = tabCount;
    return element;
  }

  public async render() {
    const browserWindow = await browser.windows.get(browser.windows.WINDOW_ID_CURRENT);
    const windowId = browserWindow.id;
    if (null == windowId) {
      return;
    }
    const currentWindowMenuList = this._utils.queryElementNonNull<HTMLElement>('#menuList');
    const windowListMenuList = this._utils.queryElementNonNull<HTMLElement>('#windowMenuList');
    const sitesMenuList = this._utils.queryElementNonNull<HTMLElement>('#sites-pane-top');
    const windowService = WindowService.getInstance();
    const [windowUserContextList, activeTabsByWindow, firstPartyTabMap] = await Promise.all([
      WindowUserContextList.create(windowId),
      windowService.getActiveTabsByWindow(),
      FirstPartyTabMap.create(browserWindow.incognito),
    ]);
    this.currentWindowRenderer.renderCurrentWindowView(windowUserContextList, currentWindowMenuList);
    this.windowListRenderer.renderWindowListView(activeTabsByWindow, windowListMenuList);
    this.siteListRenderer.renderSiteListView(firstPartyTabMap, sitesMenuList);
    await this.siteListRenderer.rerenderSiteDetailsView();
  }

  public async showPopup(message: string, MessageElement: HTMLElement, okButton: HTMLButtonElement, cancelButton: HTMLButtonElement): Promise<boolean> {
    MessageElement.textContent = message;
    const promise = PromiseUtils.createPromise<boolean>();
    const handler = (result: boolean) => {
      cleanUp();
      promise.resolve(result);
    };
    const cancelHandler = () => {
      handler(false);
    };
    const okHandler = () => {
      handler(true);
    };
    const catchEvent = (ev: Event) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };
    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key == 'Enter') {
        catchEvent(ev);
        okHandler();
      }
      if (ev.key == 'Escape') {
        catchEvent(ev);
        cancelHandler();
      }
    };
    const cleanUp = () => {
      cancelButton.removeEventListener('click', cancelHandler);
      okButton.removeEventListener('click', okHandler);
      document.removeEventListener('keydown', keyHandler);
    };
    cancelButton.addEventListener('click', cancelHandler);
    okButton.addEventListener('click', okHandler);
    document.addEventListener('keydown', keyHandler, true);
    return await promise.promise;
  }

  public async confirmAsync(message: string): Promise<boolean> {
    const confirmMessageElement = this._utils.queryElementNonNull<HTMLElement>('#confirm-message');
    const cancelButton = this._utils.queryElementNonNull<HTMLButtonElement>('#confirm-cancel-button');
    const okButton = this._utils.queryElementNonNull<HTMLButtonElement>('#confirm-ok-button');
    const previousHash = location.hash;
    location.hash = '#confirm';
    const result = await this.showPopup(message, confirmMessageElement, okButton, cancelButton);
    location.hash = previousHash;
    return result;
  }

  public async showContainerManipulationPanelAsync(dialogTitle: string, userContext?: UserContext): Promise<NewContainerPanelResult> {
    const message = dialogTitle;
    const messageElement = this._utils.queryElementNonNull<HTMLElement>('#new-container .modal-title');
    const cancelButton = this._utils.queryElementNonNull<HTMLButtonElement>('#new-container-cancel-button');
    const okButton = this._utils.queryElementNonNull<HTMLButtonElement>('#new-container-ok-button');
    const nameElement = this._utils.queryElementNonNull<HTMLInputElement>('#new-container-name');
    const iconElement = this._utils.queryElementNonNull<IconPickerElement>('#new-container-icon');
    const colorElement = this._utils.queryElementNonNull<ColorPickerElement>('#new-container-color');
    const previousHash = location.hash;
    nameElement.value = '';
    iconElement.value = 'fingerprint';
    colorElement.value = 'blue';
    if (userContext) {
      nameElement.value = userContext.name;
      iconElement.value = userContext.icon;
      colorElement.value = userContext.color;
    }
    location.hash = '#new-container';
    const result = await this.showPopup(message, messageElement, okButton, cancelButton);
    location.hash = previousHash;
    if (!result) {
      throw new Error('User cancelled');
    }
    const name = nameElement.value;
    const icon = iconElement.value;
    const color = colorElement.value;
    return { name, icon, color };
  }

  public async showNewContainerPanelAsync(): Promise<UserContext | null> {
    try {
      const { name, icon, color } = await this.showContainerManipulationPanelAsync(browser.i18n.getMessage('newContainerDialogTitle'));
      return await this._userContextService.create(name, color, icon);
    } catch (e) {
      return null;
    }
  }

  public async showEditContainerPanelAsync(userContext: UserContext): Promise<UserContext> {
    try {
      const { name, icon, color } = await this.showContainerManipulationPanelAsync(browser.i18n.getMessage('editContainerDialogTitle'), userContext);
      return await this._userContextService.updateProperties(userContext, name, color, icon);
    } catch (e) {
      return userContext;
    }
  }
}
