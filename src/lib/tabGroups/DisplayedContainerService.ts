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

import { ExtensionService } from "weeg-utils";
import { DisplayedContainer, CookieStore } from "weeg-containers";

import { ContextualIdentityService } from "./ContextualIdentityService";
import { ServiceRegistry } from "../ServiceRegistry";

export class DisplayedContainerService {
  private static readonly INSTANCE = new DisplayedContainerService();

  public static getInstance(): DisplayedContainerService {
    return DisplayedContainerService.INSTANCE;
  }

  private readonly _extensionService = ExtensionService.getInstance();
  private readonly _contextualIdentityService = ContextualIdentityService.getInstance();
  private readonly _contextualIdentityFactory = this._contextualIdentityService.getFactory();
  private readonly _displayedContainerFactory = this._contextualIdentityService.getDisplayedContainerFactory();

  private constructor() {
    // nothing.
  }

  public async getDisplayedContainer(cookieStoreId: string): Promise<DisplayedContainer> {
    if (cookieStoreId == CookieStore.DEFAULT.id) {
      return this._displayedContainerFactory.createFromCookieStore(CookieStore.DEFAULT);
    } else if (cookieStoreId == CookieStore.PRIVATE.id) {
      return this._displayedContainerFactory.createFromCookieStore(CookieStore.PRIVATE);
    }
    return this._contextualIdentityFactory.get(cookieStoreId);
  }

  public async getDisplayedContainers(): Promise<DisplayedContainer[]> {
    const [contextualIdentities, allowedInPrivateBrowsing] = await Promise.all([
      this._contextualIdentityFactory.getAll(),
      this._extensionService.isAllowedInPrivateBrowsing(),
    ]);
    const privateContainers = allowedInPrivateBrowsing ? [this._displayedContainerFactory.createFromCookieStore(CookieStore.PRIVATE)] : [];
    return [
      ... privateContainers,
      this._displayedContainerFactory.createFromCookieStore(CookieStore.DEFAULT),
      ... contextualIdentities,
    ];
  }

  public async getDisplayedContainersByPrivateBrowsing(isPrivate: boolean): Promise<DisplayedContainer[]> {
    if (isPrivate) {
      const allowedInPrivateBrowsing = await this._extensionService.isAllowedInPrivateBrowsing();
      return allowedInPrivateBrowsing ? [this._displayedContainerFactory.createFromCookieStore(CookieStore.PRIVATE)] : [];
    }
    const contextualIdentities = await this._contextualIdentityFactory.getAll();
    return [
      this._displayedContainerFactory.createFromCookieStore(CookieStore.DEFAULT),
      ... contextualIdentities,
    ];
  }
}

ServiceRegistry.getInstance().registerService('DisplayedContainerService', DisplayedContainerService.getInstance());
