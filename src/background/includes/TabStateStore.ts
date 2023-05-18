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

import { Asserts } from "weeg-utils";
import { EventSink } from "weeg-events";

import { TabState, ContainerOnWindow } from "./TabState";
import { OpenTabsService } from "../../lib/states/OpenTabsService";

const openTabsService = OpenTabsService.getInstance();

export class TabStateStore {
  private static _instance: TabStateStore | undefined;

  // this way just loading in unsupported contexts will not throw an error.
  public static getInstance(): TabStateStore {
    if (TabStateStore._instance === undefined) {
      TabStateStore._instance = new TabStateStore();
    }
    return TabStateStore._instance;
  }

  public readonly onBeforeTabCreated = new EventSink<TabState>();
  public readonly onTabCreated = new EventSink<TabState>();
  public readonly onTabActivated = new EventSink<TabState>();

  public readonly onContainerActivated = new EventSink<ContainerOnWindow>();
  public readonly onContainerPopulated = new EventSink<ContainerOnWindow>();
  public readonly onContainerUnpopulated = new EventSink<ContainerOnWindow>();
  public readonly onContainerUnpinnedPopulated = new EventSink<ContainerOnWindow>();
  public readonly onContainerUnpinnedUnpopulated = new EventSink<ContainerOnWindow>();

  private constructor() {
    Asserts.assertBackgroundScript();
    Asserts.assertTopLevel();
  }

  public handleOpenedTab(tabState: TabState): void {
    openTabsService.addTab(tabState.id);
  }
}
