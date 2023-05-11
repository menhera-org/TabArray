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
import { PromiseUtils } from 'weeg-utils';
import { DisplayedContainer } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';
import { ViewRefreshHandler } from 'weeg-utils';

import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';
import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';
import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';
import { TemporaryContainerService } from '../../lib/tabGroups/TemporaryContainerService';
import { TabQueryService } from '../../lib/tabs/TabQueryService';
import { CompatConsole } from '../../lib/console/CompatConsole';
import { PerformanceHistoryService } from '../../lib/history/PerformanceHistoryService';

import { PanoramaStateStore } from "./PanoramaStateStore";

import { IndexTab } from "../../legacy-lib/modules/IndexTab";
import * as i18n from '../../legacy-lib/modules/i18n';

import { PanoramaTabElement } from "../../components/panorama-tab";
import { PanoramaContainerElement } from "../../components/panorama-container";
import { ContainerEditorElement } from '../../components/container-editor';
import { ModalConfirmElement } from '../../components/modal-confirm';
import { ModalFrameElement } from '../../components/modal-frame';
import { HelpBannerElement } from '../../components/help-banner';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const panoramaStateStore = new PanoramaStateStore();
const temporaryContainerService = TemporaryContainerService.getInstance();
const tabGroupDirectory = new TabGroupDirectory();
const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const displayedContainerService = DisplayedContainerService.getInstance();
const tabQueryService = TabQueryService.getInstance();
const performanceHistoryService = PerformanceHistoryService.getInstance<PerformanceHistoryService>();

document.title = i18n.getMessage('panoramaGrid');
document.documentElement.lang = i18n.getEffectiveLocale();

const newContainerButtonElement = document.getElementById('button-new-container') as HTMLButtonElement;
newContainerButtonElement.title = i18n.getMessage('buttonNewContainer');

const newTemporaryContainerButtonElement = document.getElementById('button-new-temporary-container') as HTMLButtonElement;
newTemporaryContainerButtonElement.title = i18n.getMessage('buttonNewTemporaryContainer');

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

newTemporaryContainerButtonElement.addEventListener('click', () => {
  temporaryContainerService.createTemporaryContainer().then(() => {
    window.close();
  }).catch((e) => {
    console.error(e);
  });
});

const renderTab = (tab: CompatTab) => {
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

const renderContainer = async (displayedContainer: DisplayedContainer, isPrivate = false, windowId: number) => {
  if (isPrivate) {
    console.assert(displayedContainer.cookieStore.isPrivate == true);
  }
  const cookieStore = displayedContainer.cookieStore;
  const containerElement = new PanoramaContainerElement(displayedContainer);
  containerElement.targetId = cookieStore.id;
  const tabs = (await tabQueryService.queryTabs({
    tabGroupId: cookieStore.id,
  })).filter((tab) => !IndexTab.isIndexTabUrl(tab.url));
  containerElement.tabCount = tabs.length;
  containerElement.containerTabsElement.append(...tabs.map((tab) => {
    const tabElement = renderTab(tab);
    return tabElement;
  }));
  containerElement.onNewTabButtonClick.addListener(() => {
    containerTabOpenerService.openNewTabInContainer(cookieStore.id, true, windowId).then(() => {
      window.close();
    }).catch((e) => {
      console.error(e);
    });
  });
  if (0 != cookieStore.userContextId) {
    containerElement.onContainerEditButtonClick.addListener(async () => {
      if (containerEditorElement) {
        containerEditorElement.remove();
      }
      const contextualIdentity = await contextualIdentityFactory.get(cookieStore.id);
      containerEditorElement = new ContainerEditorElement(contextualIdentity);
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
      const contextualIdentity = await contextualIdentityFactory.get(cookieStore.id);
      if (!contextualIdentity) return;
      const confirmElement = new ModalConfirmElement(browser.i18n.getMessage('confirmContainerDelete', contextualIdentity.name));
      confirmElement.onOk.addListener(async () => {
        await contextualIdentityFactory.remove(cookieStore.id);
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
      await containerTabOpenerService.reopenTabInContainer(data.id, cookieStore.id, false);

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
  const startTime = Date.now();
  // console.log('render()');
  const [tabGroupDirectorySnapshot, browserWindow] = await Promise.all([
    tabGroupDirectory.getSnapshot(),
    browser.windows.get(browser.windows.WINDOW_ID_CURRENT),
  ]);
  const isPrivate = browserWindow.incognito;
  const displayedContainers = await displayedContainerService.getDisplayedContainersByPrivateBrowsing(isPrivate);
  tabGroupDirectorySnapshot.sortDisplayedContainers(displayedContainers);
  if (browserWindow.id == null) {
    throw new Error('browserWindow.id is null');
  }
  const windowId = browserWindow.id;
  const containerElements = await Promise.all(displayedContainers.map((displayedContainer) => renderContainer(displayedContainer, isPrivate, windowId)));
  const nonemptyContainerElements = containerElements.filter((containerElement) => containerElement.tabCount > 0);
  const emptyContainerElements = containerElements.filter((containerElement) => containerElement.tabCount === 0);
  const containersContainer = document.querySelector<HTMLDivElement>('#containers');
  if (!containersContainer) {
    throw new Error('containersContainer is null');
  }
  containersContainer.textContent = '';
  containersContainer.append(... nonemptyContainerElements, ... emptyContainerElements);
  const endTime = Date.now();
  const duration = endTime - startTime;
  performanceHistoryService.addEntry('panorama.render', startTime, duration);
  if (duration > 200) {
    console.info(`render(): took ${duration}ms`);
  }
};

const handler = new ViewRefreshHandler(render);

handler.render().catch((e) => {
  console.error(e);
});

contextualIdentityFactory.onCreated.addListener(() => handler.render());
contextualIdentityFactory.onRemoved.addListener(() => handler.render());
contextualIdentityFactory.onUpdated.addListener(() => handler.render());
browser.tabs.onRemoved.addListener(() => handler.render());
browser.tabs.onUpdated.addListener(() => handler.render(), { properties: ['favIconUrl', 'title', 'url'] });
browser.tabs.onCreated.addListener(() => handler.render());
browser.tabs.query({}).then((browserTabs) => {
  const tabs = browserTabs.map((browserTab) => new CompatTab(browserTab));
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
