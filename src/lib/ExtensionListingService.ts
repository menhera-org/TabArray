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

import { ExtensionVersion } from './ExtensionVersion';
import { ServiceRegistry } from './ServiceRegistry';

export type AmoListing = {
  numericId: number;
  slug: string;
  listingUrl: string;
  rating: number;
  averageDailyUsers: number;
  weeklyDownloads: number;
  currentVersion: string;
};

export class ExtensionListingService {
  private static readonly INSTANCE = new ExtensionListingService();

  public static getInstance(): ExtensionListingService {
    return ExtensionListingService.INSTANCE;
  }

  private constructor() {
    // Singleton
  }

  public getExtensionId(): string {
    return browser.runtime.id;
  }

  public getCurrentVersion(): string {
    return browser.runtime.getManifest().version;
  }

  public getExtensionName(): string {
    return browser.runtime.getManifest().name;
  }

  public async getAmoListing(): Promise<AmoListing> {
    const id = this.getExtensionId();
    const apiUrl = `https://addons.mozilla.org/api/v5/addons/addon/${id}/`;
    const res = await fetch(apiUrl);
    if (res.status != 200) {
      throw new Error(`Failed to fetch AMO listing for ${id}`);
    }
    const data = await res.json();
    const slug = data.slug;
    const listingUrl = `https://addons.mozilla.org/firefox/addon/${slug}/`;
    const currentVersion = data.current_version.version;
    const weeklyDownloads = data.weekly_downloads;
    const averageDailyUsers = data.average_daily_users;
    const numericId = data.id;
    const rating = data.ratings.average;
    return {
      numericId,
      slug,
      listingUrl,
      rating,
      averageDailyUsers,
      weeklyDownloads,
      currentVersion,
    };
  }

  public async checkForAvailableVersion(): Promise<string | null> {
    const currentVersion = ExtensionVersion.fromString(this.getCurrentVersion());
    const amoListing = await this.getAmoListing();
    const amoVersion = ExtensionVersion.fromString(amoListing.currentVersion);
    if (amoVersion.isGreaterThan(currentVersion)) {
      return amoListing.currentVersion;
    }
    return null;
  }
}

ServiceRegistry.getInstance().registerService('ExtensionListingService', ExtensionListingService.getInstance());
