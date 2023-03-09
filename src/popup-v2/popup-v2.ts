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
import { ContainerDetailsFragmentBuilder } from "./fragments/ContainerDetailsFragmentBuilder";
import { SiteDetailsFragmentBuilder } from "./fragments/SiteDetailsFragmentBuilder";

import { ViewRefreshHandler } from "../frameworks/rendering/ViewRefreshHandler";
import { BrowserStateSnapshot } from "../frameworks/tabs/BrowserStateSnapshot";
import { UserContextSortingOrderStore } from "../userContexts/UserContextSortingOrderStore";
import { config, privacyConfig } from '../config/config';
import { ConfigurationOption } from '../frameworks/config';
import { StorageArea } from "../frameworks/storage";

import { PopupRendererService } from "./PopupRendererService";
import { PopupFocusHandlers } from "./PopupFocusHandlers";
import { PopupCommandHandler } from "./PopupCommandHandler";

const searchParams = new URLSearchParams(window.location.search);
if (searchParams.get('popup') == '1') {
  document.body.classList.add('popup');
  if (searchParams.get('large') == '1') {
    document.body.classList.add('popup-large');
  }
}

const popupRenderer = PopupRendererService.getInstance().popupRenderer;
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
const popupFocusHandlers = new PopupFocusHandlers(frameLayout);
const popupCommandHandler = new PopupCommandHandler(frameLayout);

const fragments: CtgFragmentElement[] = [];
const windowsBuilder = new WindowsFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const containersBuilder = new ContainersFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const sitesBuilder = new SitesFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const helpBuilder = new HelpFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);

const containerDetailsBuilder = new ContainerDetailsFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const siteDetailsBuilder = new SiteDetailsFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);

fragments.push(windowsBuilder.getFragment());
fragments.push(containersBuilder.getFragment());
fragments.push(sitesBuilder.getFragment());
fragments.push(helpBuilder.getFragment());
fragments.push(containerDetailsBuilder.getFragment());
fragments.push(siteDetailsBuilder.getFragment());

const defaultFragment = fragments[0] as CtgFragmentElement;
frameLayout.activateFragment(defaultFragment.id);

bottomNavigationElement.onTargetClicked.addListener((target) => {
  frameLayout.activateFragment(target);
});

topBarElement.onBackButtonClicked.addListener(() => {
  const parentFragmentId = frameLayout.getActiveFragment()?.navigationGroup ?? null;
  if (!parentFragmentId) return;
  frameLayout.activateFragment(parentFragmentId);
});

// not used
globalMenuItems.defineDrawerMenuItems(drawerElement);

const renderer = new ViewRefreshHandler(async () => {
  const browserStateSnapshot = await BrowserStateSnapshot.create();
  windowsBuilder.render(browserStateSnapshot);
  containersBuilder.render(browserStateSnapshot.getContainersStateSnapshot());
  const currentWindowSnapshot = browserStateSnapshot.getWindowStateSnapshot(browserStateSnapshot.currentWindowId);
  sitesBuilder.render(browserStateSnapshot.getFirstPartyStateSnapshot(currentWindowSnapshot.isPrivate));

  containerDetailsBuilder.render(browserStateSnapshot);
  siteDetailsBuilder.render(browserStateSnapshot, currentWindowSnapshot.isPrivate);

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

// Containers view

containersBuilder.onContainerSelected.addListener((cookieStoreId) => {
  containerDetailsBuilder.activate(cookieStoreId);
});

// Sites view

sitesBuilder.onSiteClicked.addListener((domain) => {
  siteDetailsBuilder.activate(domain);
});

// Help view

const setConfigValue = <T,>(option: ConfigurationOption<T>, value: T) => {
  option.setValue(value).catch((e) => {
    console.error(e);
  });
};

const setFirstPartyIsolate = (value: boolean) => {
  (async () => {
    if (value) {
      const cookieBehavior = await privacyConfig.cookieConfigBehavior.getValue();
      if (cookieBehavior == 'reject_trackers_and_partition_foreign') {
        await privacyConfig.cookieConfigBehavior.setValue('reject_trackers');
      }
    }
    console.debug('setting firstPartyIsolate to ' + value);
    setConfigValue(privacyConfig.firstPartyIsolate, value);
  })().catch((e) => {
    console.error(e);
  });
};

const helpFragment = helpBuilder.getFragment();

let firstRun = false;
config['help.shownOnce'].getValue().then((shownOnce) => {
  if (!shownOnce) {
    frameLayout.activateFragment(helpFragment.id);
    firstRun = true;
    initializeHelp();
  }
});

const initializeHelp = () => {
  helpBuilder.fpiChecked = true;
};

const setHelpShownOnce = () => {
  config['help.shownOnce'].setValue(true, StorageArea.LOCAL).catch((e) => {
    console.error(e);
  });
};

privacyConfig.firstPartyIsolate.observe((value) => {
  if (firstRun) {
    initializeHelp();
    return;
  }
  helpBuilder.fpiChecked = value;
});

helpBuilder.onFpiCheckedChanged.addListener((checked) => {
  setFirstPartyIsolate(checked);
});

// feature.languageOverrides setting
config['feature.languageOverrides'].observe((value) => {
  helpBuilder.languageOverridesChecked = value;
});

helpBuilder.onLanguageOverridesCheckedChanged.addListener((checked) => {
  setConfigValue(config['feature.languageOverrides'], checked);
});

// feature.uaOverrides setting
config['feature.uaOverrides'].observe((value) => {
  helpBuilder.uaOverridesChecked = value;
});

helpBuilder.onUaOverridesCheckedChanged.addListener((checked) => {
  setConfigValue(config['feature.uaOverrides'], checked);
});

helpFragment.onDeactivated.addListener(() => {
  setFirstPartyIsolate(helpBuilder.fpiChecked);
  setHelpShownOnce();
});

helpBuilder.onGetStartedClicked.addListener(() => {
  frameLayout.activateFragment(defaultFragment.id);
});

popupRenderer.modalRenderer.pushKeyHandlers(popupFocusHandlers.okHandler, popupFocusHandlers.cancelHandler, popupFocusHandlers.keyHandler);

popupCommandHandler.start();
