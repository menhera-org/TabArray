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

import browser from 'webextension-polyfill';
import * as containers from '../modules/containers';
import { PanoramaStateStore } from "./PanoramaStateStore";
import { PanoramaTabElement } from "../components/panorama-tab";
import { Tab } from "../frameworks/tabs";
import { IndexTab } from "../modules/IndexTab";
import { UserContextService } from "../userContexts/UserContextService";
import { PanoramaContainerElement } from "../components/panorama-container";
import { UserContext } from "../frameworks/tabGroups";
import * as i18n from '../modules/i18n';
import { WindowService } from '../frameworks/tabs';
import { TabGroupService } from '../frameworks/tabGroups';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';
import { CookieStore, ContextualIdentity, ContainerAttributes } from '../frameworks/tabAttributes';
import { ContainerEditorElement } from '../components/container-editor';
import { ModalConfirmElement } from '../components/modal-confirm';
import { ViewRefreshHandler } from '../frameworks/rendering/ViewRefreshHandler';
import { MessagingService } from '../frameworks/extension/MessagingService';
import { PromiseUtils } from '../frameworks/utils';
import { ModalFrameElement } from '../components/modal-frame';
import { HelpBannerElement } from '../components/help-banner';

const panoramaStateStore = new PanoramaStateStore();
const userContextService = UserContextService.getInstance();
const windowService = WindowService.getInstance();
const tabGroupService = TabGroupService.getInstance();
const userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();
const messagingService = MessagingService.getInstance();

document.title = i18n.getMessage('panoramaGrid');
document.documentElement.lang = i18n.getEffectiveLocale();

const newContainerButtonElement = document.getElementById('button-new-container') as HTMLButtonElement;
newContainerButtonElement.title = i18n.getMessage('buttonNewContainer');

const settingsButtonElement = document.getElementById('button-settings') as HTMLButtonElement;
settingsButtonElement.title = i18n.getMessage('buttonSettings');

const helpButtonElement = document.getElementById('button-help') as HTMLButtonElement;
helpButtonElement.title = i18n.getMessage('menuItemHelp');

let containerEditorElement: ContainerEditorElement | null = null;
newContainerButtonElement.addEventListener('click', () => {
  if (containerEditorElement) {
    containerEditorElement.remove();
  }
  containerEditorElement = new ContainerEditorElement();
  document.body.appendChild(containerEditorElement);
  containerEditorElement.onContainerCreated.addListener(async (cookieStoreId) => {
    containerEditorElement?.remove();
    containerEditorElement = null;
    for (let i = 0; i < 10; i++) {
      await PromiseUtils.sleep(100);
      location.hash = `#${cookieStoreId}`;
    }
  });
  containerEditorElement.onCancel.addListener(() => {
    containerEditorElement?.remove();
    containerEditorElement = null;
  });
});

const renderTab = (tab: Tab) => {
  const tabElement = new PanoramaTabElement();
  if (tab.url) {
    tabElement.title = tab.url;
  }
  if (tab.title) {
    tabElement.tabTitle = tab.title;
  } else if (tab.url) {
    tabElement.tabTitle = tab.url;
  }
  if (tab.url == 'about:addons' || tab.favIconUrl == 'chrome://mozapps/skin/extensions/extension.svg') {
    tabElement.iconUrl = '/img/firefox-icons/extension.svg';
  } else if (tab.favIconUrl) {
    tabElement.iconUrl = tab.favIconUrl;
  }
  const previewUrl = panoramaStateStore.getPreviewUrl(tab.id);
  if (previewUrl) {
    tabElement.previewUrl = previewUrl;
  } else {
    tabElement.previewUrl = '/img/firefox-icons/defaultPreview.svg';
  }

  // https://qiita.com/piroor/items/44ccbc2ee918bc88c3ea
  tabElement.addEventListener('contextmenu', () => {
    browser.menus.overrideContext({
      context: 'tab',
      tabId: tab.id,
    });
  }, { capture: true });

  tabElement.addEventListener('button-tab-click', async () => {
    await tab.focus();
    window.close();
  });
  tabElement.addEventListener('button-tab-close', async () => {
    await browser.tabs.remove(tab.id);
    await handler.render();
  });

  tabElement.addEventListener('dragstart', (ev) => {
    if (!ev.dataTransfer) return;
    ev.dataTransfer.setData('application/json', JSON.stringify({
      id: tab.id,
    }));
    const img = new Image();
    img.src = previewUrl;
    // ev.dataTransfer?.setDragImage(img, 16, 16);
    ev.dataTransfer.dropEffect = 'move';
  });
  return tabElement;
};

const renderContainer = async (userContext: UserContext, isPrivate = false) => {
  const userContextId = userContext.id;
  if (isPrivate) {
    console.assert(userContextId == 0);
  }
  const cookieStore = isPrivate ? CookieStore.PRIVATE : CookieStore.fromId(userContext.cookieStoreId);
  const containerElement = new PanoramaContainerElement(userContext);
  containerElement.targetId = cookieStore.id;
  const tabGroup = await (isPrivate ? tabGroupService.getPrivateBrowsingTabGroup() : userContext.getTabGroup());
  const tabs = (await tabGroup.tabList.getTabs()).filter((tab) => !IndexTab.isIndexTabUrl(tab.url));
  containerElement.tabCount = tabs.length;
  containerElement.containerTabsElement.append(...tabs.map((tab) => {
    const tabElement = renderTab(tab);
    return tabElement;
  }));
  containerElement.onNewTabButtonClick.addListener(() => {
    containers.openNewTabInContainer(userContextId, browser.windows.WINDOW_ID_CURRENT).then(() => {
      window.close();
    }).catch((e) => {
      console.error(e);
    });
  });
  if (0 != userContextId) {
    containerElement.onContainerEditButtonClick.addListener(async () => {
      if (containerEditorElement) {
        containerEditorElement.remove();
      }
      const contextualIdentity = await ContextualIdentity.get(cookieStore.id);
      const containerAttributes = ContainerAttributes.fromContextualIdentity(contextualIdentity);
      containerEditorElement = new ContainerEditorElement(containerAttributes);
      document.body.appendChild(containerEditorElement);
      containerEditorElement.onContainerUpdated.addListener(async (cookieStoreId) => {
        containerEditorElement?.remove();
        containerEditorElement = null;
        for (let i = 0; i < 10; i++) {
          await PromiseUtils.sleep(100);
          location.hash = `#${cookieStoreId}`;
        }
      });
      containerEditorElement.onCancel.addListener(() => {
        containerEditorElement?.remove();
        containerEditorElement = null;
      });
    });

    containerElement.onContainerDeleteButtonClick.addListener(async () => {
      const contextualIdentity = await ContextualIdentity.get(cookieStore.id);
      if (!contextualIdentity) return;
      const confirmElement = new ModalConfirmElement(browser.i18n.getMessage('confirmContainerDelete', contextualIdentity.name));
      confirmElement.onOk.addListener(async () => {
        await ContextualIdentity.remove(cookieStore.id);
      });
      document.body.appendChild(confirmElement);
    });
  }
  containerElement.addEventListener('dragover', (ev) => {
    ev.preventDefault();
  });
  containerElement.addEventListener('drop', async (ev) => {
    ev.preventDefault();
    const json = ev.dataTransfer?.getData('application/json');
    try {
      const data = JSON.parse(json || '');
      if (!data.id) return;
      console.log('drop', data.id, cookieStore.id);
      await messagingService.sendMessage('reopen_tab_in_container', {
        tabId: data.id,
        cookieStoreId: cookieStore.id,
      });

      let count = 0;
      const intervalId = setInterval(() => {
        count++;
        if (count > 20) {
          clearInterval(intervalId);
          return;
        }
        location.hash = `#${cookieStore.id}`;
      }, 100);
    } catch (e) {
      // ignore
    }
  })
  return containerElement;
};

const render = async () => {
  console.log('render()');
  await userContextSortingOrderStore.initialized;
  const isPrivate = await windowService.isPrivateWindow(browser.windows.WINDOW_ID_CURRENT);
  const userContexts = userContextSortingOrderStore.sort(await UserContext.getAll(isPrivate))
    .map((userContext) => userContextService.fillDefaultValues(userContext));
  const containerElements = await Promise.all(userContexts.map((userContext) => renderContainer(userContext, isPrivate)));
  const nonemptyContainerElements = containerElements.filter((containerElement) => containerElement.tabCount > 0);
  const emptyContainerElements = containerElements.filter((containerElement) => containerElement.tabCount === 0);
  const containersContainer = document.querySelector<HTMLDivElement>('#containers');
  if (!containersContainer) {
    throw new Error('containersContainer is null');
  }
  containersContainer.textContent = '';
  containersContainer.append(... nonemptyContainerElements, ... emptyContainerElements);
  console.log('render(): finished');
};

const handler = new ViewRefreshHandler(render);

handler.render().catch((e) => {
  console.error(e);
});

ContextualIdentity.onCreated.addListener(() => handler.render());
ContextualIdentity.onRemoved.addListener(() => handler.render());
ContextualIdentity.onUpdated.addListener(() => handler.render());
browser.tabs.onRemoved.addListener(() => handler.render());
browser.tabs.onUpdated.addListener(() => handler.render(), { properties: ['favIconUrl', 'title', 'url'] });
browser.tabs.onCreated.addListener(() => handler.render());
browser.tabs.query({}).then((browserTabs) => {
  const tabs = browserTabs.map((browserTab) => new Tab(browserTab));
  panoramaStateStore.updatePreviewUrls(tabs.map((tab) => tab.id)).then(() => {
    handler.render().catch((e) => {
      console.error(e);
    });
  });
});

settingsButtonElement.addEventListener('click', () => {
  browser.runtime.openOptionsPage().then(() => {
    window.close();
  });
});

helpButtonElement.addEventListener('click', () => {
  const modalFrame = new ModalFrameElement();
  const helpBanner = new HelpBannerElement();
  modalFrame.appendChild(helpBanner);
  document.body.appendChild(modalFrame);
});
