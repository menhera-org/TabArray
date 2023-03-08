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

import "../components/ctg/ctg-vertical-layout";
import "../components/ctg/ctg-drawer";
import "../components/ctg/ctg-top-bar";
import "../components/ctg/ctg-frame-layout";
import "../components/ctg/ctg-fragment";
import "../components/ctg/ctg-menu-item";
import "../components/ctg/ctg-bottom-navigation";
import { CtgDrawerElement } from "../components/ctg/ctg-drawer";
import { CtgTopBarElement } from "../components/ctg/ctg-top-bar";
import { CtgFrameLayoutElement } from "../components/ctg/ctg-frame-layout";
import { CtgBottomNavigationElement } from "../components/ctg/ctg-bottom-navigation";
import { CtgFragmentElement } from "../components/ctg/ctg-fragment";
import browser from "webextension-polyfill";
import { GlobalMenuItems } from "./GlobalMenuItems";
import { WindowsFragmentBuilder } from "./fragments/WindowsFragmentBuilder";
import { ContainersFragmentBuilder } from "./fragments/ContainersFragmentBuilder";
import { SitesFragmentBuilder } from "./fragments/SitesFragmentBuilder";
import { HelpFragmentBuilder } from "./fragments/HelpFragmentBuilder";
import { ViewRefreshHandler } from "../frameworks/rendering/ViewRefreshHandler";
import { BrowserStateSnapshot } from "../frameworks/tabs/BrowserStateSnapshot";
import { UserContextSortingOrderStore } from "../userContexts/UserContextSortingOrderStore";

const searchParams = new URLSearchParams(window.location.search);
if (searchParams.get('popup') == '1') {
  document.body.classList.add('popup');
  if (searchParams.get('large') == '1') {
    document.body.classList.add('popup-large');
  }
}

const userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();
const extensionName = browser.runtime.getManifest().name;
document.title = browser.i18n.getMessage('browserActionPopupTitle');

const globalMenuItems = new GlobalMenuItems();

const drawerElement = document.querySelector('#drawer') as CtgDrawerElement;
drawerElement.heading = extensionName;
drawerElement.hidden = true;

const topBarElement = document.querySelector('#top-bar') as CtgTopBarElement;
topBarElement.headingText = extensionName;
topBarElement.onDrawerButtonClicked.addListener(() => {
  drawerElement.hidden = false;
});

topBarElement.drawerButtonEnabled = false;

const frameLayout = document.querySelector('#frame-layout') as CtgFrameLayoutElement;
const bottomNavigationElement = document.querySelector('#bottom-navigation') as CtgBottomNavigationElement;

const fragments: CtgFragmentElement[] = [];
const windowsBuilder = new WindowsFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const containersBuilder = new ContainersFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const sitesBuilder = new SitesFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);

fragments.push(windowsBuilder.getFragment());
fragments.push(containersBuilder.getFragment());
fragments.push(sitesBuilder.getFragment());
fragments.push((new HelpFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems)).getFragment());

const defaultFragment = fragments[0] as CtgFragmentElement;
frameLayout.activateFragment(defaultFragment.id);
bottomNavigationElement.selectTarget(defaultFragment.id);

bottomNavigationElement.onTargetClicked.addListener((target) => {
  bottomNavigationElement.selectTarget(target);
  frameLayout.activateFragment(target);
});

// not used
globalMenuItems.defineDrawerMenuItems(drawerElement);

const renderer = new ViewRefreshHandler(async () => {
  const browserStateSnapshot = await BrowserStateSnapshot.create();
  windowsBuilder.render(browserStateSnapshot);
  containersBuilder.render(browserStateSnapshot.getContainersStateSnapshot());
  const currentWindowSnapshot = browserStateSnapshot.getWindowStateSnapshot(browserStateSnapshot.currentWindowId);
  sitesBuilder.render(browserStateSnapshot.getFirstPartyStateSnapshot(currentWindowSnapshot.isPrivate));
  console.debug('rendering done');
});

const renderInBackground = renderer.renderInBackground.bind(renderer);

browser.tabs.onActivated.addListener(renderInBackground);
browser.tabs.onUpdated.addListener(renderInBackground);
browser.tabs.onCreated.addListener(renderInBackground);
browser.tabs.onRemoved.addListener(renderInBackground);
browser.tabs.onMoved.addListener(renderInBackground);
browser.tabs.onAttached.addListener(renderInBackground);
browser.tabs.onDetached.addListener(renderInBackground);
browser.tabs.onReplaced.addListener(renderInBackground);
browser.windows.onCreated.addListener(renderInBackground);
browser.windows.onRemoved.addListener(renderInBackground);
browser.contextualIdentities.onCreated.addListener(renderInBackground);
browser.contextualIdentities.onUpdated.addListener(renderInBackground);
browser.contextualIdentities.onRemoved.addListener(renderInBackground);

userContextSortingOrderStore.onChanged.addListener(renderInBackground);

renderer.renderInBackground();
