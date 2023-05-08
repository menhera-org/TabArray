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

import { CompatConsole } from "../../lib/console/CompatConsole";

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
import { HelpBannerElement } from "../../components/help-banner";

import { GlobalMenuItems } from "../popup-v2/GlobalMenuItems";

import { LogFragmentBuilder } from "./fragments/LogFragmentBuilder";
import { PerformanceFragmentBuilder } from "./fragments/PerforamanceFragmentBuilder";
import { FilesFragmentBuilder } from "./fragments/FilesFragmentBuilder";
import { InstallationHistoryFragmentBuilder } from "./fragments/InstallationHistoryFragmentBuilder";
import { TabCountFragmentBuilder } from "./fragments/TabCountFragmentBuilder";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

document.title = browser.i18n.getMessage('debuggingInformation');

const globalMenuItems = new GlobalMenuItems();

const drawerElement = document.querySelector('#drawer') as CtgDrawerElement;
drawerElement.hidden = true;
drawerElement.appendChild(new HelpBannerElement());

const topBarElement = document.querySelector('#top-bar') as CtgTopBarElement;
topBarElement.onDrawerButtonClicked.addListener(() => {
  drawerElement.show();
});

topBarElement.drawerButtonEnabled = false;

const frameLayout = document.querySelector('#frame-layout') as CtgFrameLayoutElement;
const bottomNavigationElement = document.querySelector('#bottom-navigation') as CtgBottomNavigationElement;

const fragments: CtgFragmentElement[] = [];
const logBuilder = new LogFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const performanceBuilder = new PerformanceFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const filesBuilder = new FilesFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const installationHistoryBuilder = new InstallationHistoryFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);
const tabCountBuilder = new TabCountFragmentBuilder(frameLayout, topBarElement, bottomNavigationElement, globalMenuItems);

fragments.push(logBuilder.getFragment());
fragments.push(performanceBuilder.getFragment());
fragments.push(filesBuilder.getFragment());
fragments.push(installationHistoryBuilder.getFragment());
fragments.push(tabCountBuilder.getFragment());

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

document.addEventListener('error', (ev) => {
  console.error(ev);
});
