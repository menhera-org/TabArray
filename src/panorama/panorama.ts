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

const panoramaStateStore = new PanoramaStateStore();
const userContextService = UserContextService.getInstance();
const windowService = WindowService.getInstance();
const tabGroupService = TabGroupService.getInstance();
const userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();

document.title = i18n.getMessage('panoramaGrid');
document.documentElement.lang = i18n.getEffectiveLocale();

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
    tabElement.iconUrl = '/img/extension.svg';
  } else if (tab.favIconUrl) {
    tabElement.iconUrl = tab.favIconUrl;
  }
  const previewUrl = panoramaStateStore.getPreviewUrl(tab.id);
  if (previewUrl) {
    tabElement.previewUrl = previewUrl;
  }
  tabElement.addEventListener('button-tab-click', async () => {
    await tab.focus();
    window.close();
  });
  tabElement.addEventListener('button-tab-close', async () => {
    await browser.tabs.remove(tab.id);
    await render();
  });
  return tabElement;
};

const renderContainer = async (userContext: UserContext, isPrivate = false) => {
  const userContextId = userContext.id;
  if (isPrivate) {
    console.assert(userContextId == 0);
  }
  const containerElement = new PanoramaContainerElement(userContext);
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

render().catch((e) => {
  console.error(e);
});

browser.tabs.onRemoved.addListener(() => render());
browser.tabs.onUpdated.addListener(() => render(), { properties: ['favIconUrl', 'title', 'url'] });
browser.tabs.onCreated.addListener(() => render());
browser.tabs.query({}).then((browserTabs) => {
  const tabs = browserTabs.map((browserTab) => new Tab(browserTab));
  panoramaStateStore.updatePreviewUrls(tabs.map((tab) => tab.id)).then(() => {
    render().catch((e) => {
      console.error(e);
    });
  });
});
