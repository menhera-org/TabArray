/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2024 Menhera.org

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

import { ServiceRegistry } from '../../ServiceRegistry';
import { NativeTabGroupsNamespace } from './NativeTabGroupTypes';

const browserWithTabGroups = browser as unknown as { tabGroups?: NativeTabGroupsNamespace };

type BrowserInfo = Awaited<ReturnType<typeof browser.runtime.getBrowserInfo>>;

export class NativeTabGroupFeatureGate {
  public static readonly MINIMUM_SUPPORTED_VERSION = 130;

  private static readonly INSTANCE = new NativeTabGroupFeatureGate();

  public static getInstance(): NativeTabGroupFeatureGate {
    return NativeTabGroupFeatureGate.INSTANCE;
  }

  private browserInfoPromise: Promise<BrowserInfo | undefined> | undefined;

  private constructor() {
    // nothing.
  }

  public getMinimumSupportedVersion(): number {
    return NativeTabGroupFeatureGate.MINIMUM_SUPPORTED_VERSION;
  }

  public async isNativeTabGroupSupported(): Promise<boolean> {
    const tabGroups = browserWithTabGroups.tabGroups;
    if (!tabGroups) {
      return false;
    }

    if (this.hasRequiredMethods(tabGroups)) {
      return true;
    }

    const majorVersion = await this.getBrowserMajorVersion();
    if (majorVersion === undefined) {
      return true;
    }

    return majorVersion >= NativeTabGroupFeatureGate.MINIMUM_SUPPORTED_VERSION;
  }

  private hasRequiredMethods(tabGroups: NativeTabGroupsNamespace): boolean {
    return typeof tabGroups.query === 'function'
      && typeof tabGroups.create === 'function'
      && typeof tabGroups.update === 'function'
      && typeof tabGroups.move === 'function'
      && typeof tabGroups.remove === 'function';
  }

  public async assertNativeSupport(): Promise<void> {
    const supported = await this.isNativeTabGroupSupported();
    if (!supported) {
      throw new Error(`Native tab groups require Firefox ${NativeTabGroupFeatureGate.MINIMUM_SUPPORTED_VERSION} or later.`);
    }
  }

  private async getBrowserMajorVersion(): Promise<number | undefined> {
    const version = await this.getBrowserVersion();
    if (!version) {
      return undefined;
    }

    const matches = /^(\d+)/.exec(version);
    if (!matches) {
      return undefined;
    }

    const major = Number.parseInt(matches[1] as string, 10);
    if (Number.isNaN(major)) {
      return undefined;
    }

    return major;
  }

  private async getBrowserVersion(): Promise<string | undefined> {
    const info = await this.getBrowserInfo();
    return info?.version;
  }

  private async getBrowserInfo(): Promise<BrowserInfo | undefined> {
    if (typeof browser.runtime.getBrowserInfo !== 'function') {
      return undefined;
    }

    if (!this.browserInfoPromise) {
      this.browserInfoPromise = browser.runtime.getBrowserInfo().catch(() => undefined);
    }

    return await this.browserInfoPromise;
  }
}

ServiceRegistry.getInstance().registerService('NativeTabGroupFeatureGate', NativeTabGroupFeatureGate.getInstance());
