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
import { CtgMenuItemElement } from "../../components/ctg/ctg-menu-item";
import browser from "webextension-polyfill";
import { ContainersStateSnapshot } from "../../frameworks/tabs/ContainersStateSnapshot";
import { PopupRendererService } from "../PopupRendererService";
import { OriginAttributes, TabGroup, UserContext } from "../../frameworks/tabGroups";
import { EventSink } from "weeg-events";
import { TemporaryContainerService } from "../../containers/TemporaryContainerService";

export class ContainersFragmentBuilder extends AbstractFragmentBuilder {
  public readonly onContainerSelected = new EventSink<string>();

  private _containerCount = 0;
  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private readonly _temporaryContainerService = TemporaryContainerService.getInstance();

  public getFragmentId(): string {
    return 'fragment-containers';
  }

  public getLabelText(): string {
    return browser.i18n.getMessage('menuItemMain');
  }

  public getIconUrl(): string {
    return '/img/material-icons/folder.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();

    const activeContainersElement = document.createElement('div');
    activeContainersElement.classList.add('active-containers');
    fragment.appendChild(activeContainersElement);

    const inactiveContainersElement = document.createElement('div');
    inactiveContainersElement.classList.add('inactive-containers');
    fragment.appendChild(inactiveContainersElement);

    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    const newContainerMenuItem = new CtgMenuItemElement();
    newContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewContainer');
    newContainerMenuItem.iconSrc = '/img/material-icons/create_new_folder.svg';
    topBarElement.addMenuItem('new-container', newContainerMenuItem);

    const newNormalContainerMenuItem = new CtgMenuItemElement();
    newNormalContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewContainer');
    newNormalContainerMenuItem.iconSrc = '/img/material-icons/create_new_folder.svg';
    newContainerMenuItem.appendChild(newNormalContainerMenuItem);

    const newTemporaryContainerMenuItem = new CtgMenuItemElement();
    newTemporaryContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewTemporaryContainer');
    newTemporaryContainerMenuItem.iconSrc = '/img/material-icons/timelapse.svg';
    newContainerMenuItem.appendChild(newTemporaryContainerMenuItem);

    newNormalContainerMenuItem.addEventListener('click', () => {
      this._popupRenderer.modalRenderer.showNewContainerPanelAsync().then((result) => {
        if (!result) return;
        console.log('Created new container', result);
      }).catch((e) => {
        console.error(e);
      });
    });

    newTemporaryContainerMenuItem.addEventListener('click', () => {
      this._temporaryContainerService.createTemporaryContainer().then((identity) => {
        console.debug('Created temporary container', identity);
      }).catch((e) => {
        console.error(e);
      });
    });

    // TODO: add i18n string
    const labelText = this.getLabelText();
    topBarElement.headingText = `${labelText} (${this._containerCount.toFixed(0)})`;
  }

  public render(containersStateSnapshot: ContainersStateSnapshot): void {
    this._containerCount = containersStateSnapshot.containerAttributesList.length;
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }
    const tabGroupDirectorySnapshot = containersStateSnapshot.tabGroupDirectorySnapshot;
    const fragment = this.getFragment();
    const activeContainersElement = fragment.querySelector('.active-containers') as HTMLDivElement;
    const inactiveContainersElement = fragment.querySelector('.inactive-containers') as HTMLDivElement;
    activeContainersElement.textContent = '';
    inactiveContainersElement.textContent = '';
    const privateContainers = containersStateSnapshot.containerAttributesList.filter((container) => container.isPrivate);
    const normalContainers = containersStateSnapshot.containerAttributesList.filter((container) => !container.isPrivate);
    const privateUserContexts = privateContainers.map((container) => UserContext.fromContainerAttributes(container));
    const normalUserContexts = normalContainers.map((container) => UserContext.fromContainerAttributes(container)).sort((a, b) => {
      return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStoreId, b.cookieStoreId);
    });
    const userContexts = [... privateUserContexts, ... normalUserContexts];
    const activeUserContexts = userContexts.filter((userContext) => {
      const tabs = containersStateSnapshot.getTabsByContainer(userContext.cookieStoreId);
      return tabs.length > 0;
    });
    const inactiveUserContexts = userContexts.filter((userContext) => {
      const tabs = containersStateSnapshot.getTabsByContainer(userContext.cookieStoreId);
      return tabs.length < 1;
    });
    this.renderContainers(containersStateSnapshot, activeUserContexts, activeContainersElement);
    this.renderContainers(containersStateSnapshot, inactiveUserContexts, inactiveContainersElement);
  }

  private renderContainers(containersStateSnapshot: ContainersStateSnapshot, userContexts: UserContext[], parentElement: HTMLElement) {
    for (const userContext of userContexts) {
      const isPrivate = userContext.markedAsPrivate;
      const tabs = containersStateSnapshot.getTabsByContainer(userContext.cookieStoreId);
      const containerElement = this._popupRenderer.renderPartialContainerElement(userContext, isPrivate);
      containerElement.tabCount = tabs.length;
      parentElement.appendChild(containerElement);

      containerElement.onContainerClose.addListener(async () => {
        const cookieStoreId = userContext.cookieStoreId;
        const originAttributes = OriginAttributes.fromCookieStoreId(cookieStoreId);
        const tabGroup = await TabGroup.createTabGroup(originAttributes);
        tabGroup.tabList.closeUnpinnedTabs();
      });

      containerElement.onContainerClick.addListener(() => {
        this.onContainerSelected.dispatch(userContext.cookieStoreId);
      });
    }
  }

  public override getFocusableElements(): HTMLElement[] {
    const fragment = this.getFragment();
    const activeContainersElement = fragment.querySelector('.active-containers') as HTMLDivElement;
    const inactiveContainersElement = fragment.querySelector('.inactive-containers') as HTMLDivElement;
    const activeContainers = Array.from(activeContainersElement.querySelectorAll('menulist-container'));
    const inactiveContainers = Array.from(inactiveContainersElement.querySelectorAll('menulist-container'));
    return [... activeContainers, ... inactiveContainers] as HTMLElement[];
  }
}
