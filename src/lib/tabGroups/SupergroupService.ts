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

import { ContextualIdentity, ContextualIdentityParams, CookieStore } from "weeg-containers";

import { ServiceRegistry } from "../ServiceRegistry";
import { ContextualIdentityService } from "./ContextualIdentityService";
import { TabGroupDirectory } from "./TabGroupDirectory";
import { ContainerVisibilityService } from "../../legacy-lib/userContexts/ContainerVisibilityService";
import { TemporaryContainerService } from "./TemporaryContainerService";
import { TabService } from "../tabs/TabService";
import { TabQueryService } from "../tabs/TabQueryService";
import { TabGroupService } from "./TabGroupService";
import { LanguageSettings } from "../overrides/LanguageSettings";
import { UserAgentSettings } from "../overrides/UserAgentSettings";

const tabGroupDirectory = new TabGroupDirectory();
const userContextVisibilityService = ContainerVisibilityService.getInstance();
const contextualIdentityService = ContextualIdentityService.getInstance();
const temporaryContainerService = TemporaryContainerService.getInstance();
const tabService = TabService.getInstance();
const tabQueryService = TabQueryService.getInstance();
const tabGroupService = TabGroupService.getInstance();
const languageSettings = LanguageSettings.getInstance();
const userAgentSettings = UserAgentSettings.getInstance();

export class SupergroupService {
  private static readonly INSTANCE = new SupergroupService();

  public static getInstance(): SupergroupService {
    return SupergroupService.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  public async hideSupergroupOnWindow(tabGroupId: string, windowId: number): Promise<void> {
    const childContainers = await tabGroupDirectory.getChildContainers(tabGroupId);
    const promises: Promise<void>[] = [];
    for (const childContainer of childContainers) {
      const cookieStore = new CookieStore(childContainer);
      promises.push(userContextVisibilityService.hideContainerOnWindow(windowId, cookieStore.id).catch(() => {
        // ignore (errors for private windows)
      }));
    }
    await Promise.all(promises);
  }

  public async showSupergroupOnWindow(tabGroupId: string, windowId: number): Promise<void> {
    const childContainers = await tabGroupDirectory.getChildContainers(tabGroupId);
    const promises: Promise<void>[] = [];
    for (const childContainer of childContainers) {
      const cookieStore = new CookieStore(childContainer);
      promises.push(userContextVisibilityService.showContainerOnWindow(windowId, cookieStore.id).catch(() => {
        // ignore (errors for private windows)
      }));
    }
    await Promise.all(promises);
  }

  public async closeUnpinnedSupergroupTabsOnWindow(tabGroupId: string, windowId: number): Promise<void> {
    const tabs = await tabQueryService.queryTabs({
      windowId,
      tabGroupId,
      pinned: false,
    });
    await tabService.closeTabs(tabs);
  }

  public async closeUnpinnedSupergroupTabs(tabGroupId: string): Promise<void> {
    const tabs = await tabQueryService.queryTabs({
      tabGroupId,
      pinned: false,
    });
    await tabService.closeTabs(tabs);
  }

  private async copySettingsToChildTabGroup(parentTabGroupId: string, childTabGroupId: string): Promise<void> {
    const [autoCleanEnabled, languages, uaParams] = await Promise.all([
      tabGroupService.optionDirectory.getAutocleanForTabGroupId(parentTabGroupId),
      languageSettings.getLanguages(parentTabGroupId),
      userAgentSettings.getUserAgentParams(parentTabGroupId),
    ]);
    if (autoCleanEnabled) {
      await tabGroupService.optionDirectory.setAutocleanForTabGroupId(childTabGroupId, true);
    }
    if ('' != languages) {
      await languageSettings.setLanguages(childTabGroupId, languages);
    }
    if (uaParams.preset != 'default') {
      await userAgentSettings.setUserAgent(childTabGroupId, uaParams.preset, uaParams.userAgent);
    }
  }

  public async createChildContainer(parentTabGroupId: string, params: ContextualIdentityParams): Promise<ContextualIdentity> {
    const contextualIdentity = await contextualIdentityService.getFactory().create(params);
    await tabGroupDirectory.moveTabGroupToSupergroup(contextualIdentity.cookieStore.id, parentTabGroupId);
    await this.copySettingsToChildTabGroup(parentTabGroupId, contextualIdentity.cookieStore.id);
    return contextualIdentity;
  }

  public async createChildTemporaryContainer(parentTabGroupId: string): Promise<ContextualIdentity> {
    const supergroup = await tabGroupDirectory.getSupergroup(parentTabGroupId);
    if (!supergroup) {
      throw new Error(`Supergroup not found: ${parentTabGroupId}`);
    }
    const contextualIdentityFactory = contextualIdentityService.getFactory();
    let contextualIdentity = await temporaryContainerService.createTemporaryContainer();
    const cookieStoreId = contextualIdentity.cookieStore.id;
    await tabGroupDirectory.moveTabGroupToSupergroup(cookieStoreId, parentTabGroupId);
    contextualIdentity = await contextualIdentityFactory.setParams(cookieStoreId, {
      name: contextualIdentity.name + ` (${supergroup.name})`,
      icon: contextualIdentity.icon,
      color: contextualIdentity.color,
    });
    await this.copySettingsToChildTabGroup(parentTabGroupId, contextualIdentity.cookieStore.id);
    return contextualIdentity;
  }

  public async createChildSupergroup(parentTabGroupId: string, name: string): Promise<string> {
    const tabGroupId = await tabGroupDirectory.createSupergroup(name);
    await tabGroupDirectory.moveTabGroupToSupergroup(tabGroupId, parentTabGroupId);
    await this.copySettingsToChildTabGroup(parentTabGroupId, tabGroupId);
    return tabGroupId;
  }
}

ServiceRegistry.getInstance().registerService('SupergroupService', SupergroupService.getInstance());
