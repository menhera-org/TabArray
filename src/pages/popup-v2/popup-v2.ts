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

import browser from "webextension-polyfill";
import { PromiseUtils } from "weeg-utils";

import { ConfigurationOption } from '../../lib/config/ConfigurationOption';
import { ExternalServiceProvider } from "../../lib/ExternalServiceProvider";
import { FpiService } from "../../lib/config/FpiService";
import { CompatConsole } from "../../lib/console/CompatConsole";
import { BrowserStateStore } from "../../lib/states/BrowserStateStore";
import { SpinnerService } from "../../lib/SpinnerService";

import "../../components/ctg/ctg-vertical-layout";
import "../../components/ctg/ctg-drawer";
import "../../components/ctg/ctg-top-bar";
import "../../components/ctg/ctg-frame-layout";
import "../../components/ctg/ctg-fragment";
import "../../components/ctg/ctg-menu-item";
import "../../components/ctg/ctg-bottom-navigation";
import { CtgDrawerElement } from "../../components/ctg/ctg-drawer";
import { CtgTopBarElement } from "../../components/ctg/ctg-top-bar";
import { CtgFrameLayoutElement } from "../../components/ctg/ctg-frame-layout";
import { CtgBottomNavigationElement } from "../../components/ctg/ctg-bottom-navigation";
import { CtgFragmentElement } from "../../components/ctg/ctg-fragment";

import { GlobalMenuItems } from "./GlobalMenuItems";

import { WindowsFragmentBuilder } from "./fragments/WindowsFragmentBuilder";
import { ContainersFragmentBuilder } from "./fragments/ContainersFragmentBuilder";
import { SitesFragmentBuilder } from "./fragments/SitesFragmentBuilder";
import { HelpFragmentBuilder } from "./fragments/HelpFragmentBuilder";
import { ContainerDetailsFragmentBuilder } from "./fragments/ContainerDetailsFragmentBuilder";
import { SiteDetailsFragmentBuilder } from "./fragments/SiteDetailsFragmentBuilder";


import { config, privacyConfig } from '../../config/config';

import { PopupRendererService } from "./PopupRendererService";
import { PopupFocusHandlers } from "./PopupFocusHandlers";
import { PopupCommandHandler } from "./PopupCommandHandler";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

const searchParams = new URLSearchParams(window.location.search);
if (searchParams.get('popup') == '1') {
  document.body.classList.add('popup');
  if (searchParams.get('large') == '1') {
    document.body.classList.add('popup-large');
  }
}

ExternalServiceProvider.getInstance();
const popupRenderer = PopupRendererService.getInstance().popupRenderer;
const fpiService = FpiService.getInstance();
const spinnerService = SpinnerService.getInstance();

const extensionName = browser.runtime.getManifest().name;
document.title = browser.i18n.getMessage('browserActionPopupTitle');

const globalMenuItems = new GlobalMenuItems();

const drawerElement = document.querySelector('#drawer') as CtgDrawerElement;
drawerElement.heading = browser.i18n.getMessage('menuItemHelp');
drawerElement.hidden = true;

const topBarElement = document.querySelector('#top-bar') as CtgTopBarElement;
topBarElement.headingText = extensionName;
topBarElement.onDrawerButtonClicked.addListener(() => {
  drawerElement.show();
});

// topBarElement.drawerButtonEnabled = false;
topBarElement.drawerButtonIconSrc = '/img/firefox-icons/help.svg';
topBarElement.drawerButtonText = browser.i18n.getMessage('menuItemHelp');

const frameLayout = document.querySelector('#frame-layout') as CtgFrameLayoutElement;
const bottomNavigationElement = document.querySelector('#bottom-navigation') as CtgBottomNavigationElement;
const popupFocusHandlers = new PopupFocusHandlers(frameLayout);
const popupCommandHandler = new PopupCommandHandler(frameLayout);

const fragments: CtgFragmentElement[] = [];
const windowsBuilder = new WindowsFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const containersBuilder = new ContainersFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const sitesBuilder = new SitesFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);

const containerDetailsBuilder = new ContainerDetailsFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const siteDetailsBuilder = new SiteDetailsFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);

const helpBuilder = new HelpFragmentBuilder();
drawerElement.appendChild(helpBuilder.getFragment());
drawerElement.onShown.addListener(() => {
  helpBuilder.getFragment().onActivated.dispatch();
});
drawerElement.onHidden.addListener(() => {
  helpBuilder.getFragment().onDeactivated.dispatch();
});

fragments.push(windowsBuilder.getFragment());
fragments.push(containersBuilder.getFragment());
fragments.push(sitesBuilder.getFragment());
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
  fpiService.setFirstPartyIsolate(value).catch((e) => {
    console.error(e);
  });
};

const helpFragment = helpBuilder.getFragment();

let firstRun = false;
config['help.shownOnce'].getValue().then((shownOnce) => {
  if (!shownOnce) {
    drawerElement.show();
    firstRun = true;
    initializeHelp();
  }
});

const initializeHelp = () => {
  helpBuilder.fpiChecked = true;
};

const setHelpShownOnce = () => {
  config['help.shownOnce'].setValue(true, 'local').catch((e) => {
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

// feature.containerProxy setting
config['feature.containerProxy'].observe((value) => {
  helpBuilder.perContainerProxyChecked = value;
});

helpBuilder.onPerContainerProxyCheckedChanged.addListener((checked) => {
  setConfigValue(config['feature.containerProxy'], checked);
});

helpFragment.onDeactivated.addListener(() => {
  setFirstPartyIsolate(helpBuilder.fpiChecked);
  setHelpShownOnce();
});

helpBuilder.onGetStartedClicked.addListener(() => {
  drawerElement.hide();
});

popupRenderer.modalRenderer.pushKeyHandlers(popupFocusHandlers.okHandler, popupFocusHandlers.cancelHandler, popupFocusHandlers.keyHandler);

popupCommandHandler.start();
popupCommandHandler.getCommands().then((commands) => {
  bottomNavigationElement.setTooltipForTarget('fragment-windows', commands.get('open_windows_view') ?? '');
  bottomNavigationElement.setTooltipForTarget('fragment-containers', commands.get('open_containers_view') ?? '');
  bottomNavigationElement.setTooltipForTarget('fragment-sites', commands.get('open_sites_view') ?? '');
});

// render spinner
spinnerService.onTransactionBegin.addListener((transactionId) => {
  topBarElement.beginSpinnerTransaction(transactionId);
});

spinnerService.onTransactionEnd.addListener((transactionId) => {
  topBarElement.endSpinnerTransaction(transactionId);
});

const store = new BrowserStateStore();

let rendering = false;
const render = async () => {
  if (rendering) return;
  rendering = true;
  try {
    await PromiseUtils.sleep(200);
    const value = store.value;
    windowsBuilder.render(value);
    containersBuilder.render(value);
    containerDetailsBuilder.render(value);
    sitesBuilder.render(value);
    siteDetailsBuilder.render(value);
  } finally {
    rendering = false;
  }
};

store.onChanged.addListener(() => {
  render().catch((e) => {
    console.error('Rendering errored:', e);
  });
});
