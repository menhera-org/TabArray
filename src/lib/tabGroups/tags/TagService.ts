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
import { TabAttributeProvider, DummyTab, CompatTab } from "weeg-tabs";
import { ExtensibleAttributeSet } from "weeg-utils";
import { EventSink } from "weeg-events";

import { ServiceRegistry } from "../../ServiceRegistry";
import { BroadcastTopic } from "../../BroadcastTopic";

import { TagDirectory } from "./TagDirectory";
import { TagType } from "./TagType";
import { TabAttributeMap } from "./TabAttributeMap";
import { TabAttributeTagId } from "./TabAttributeTagId";

export class TagService {
  public static readonly ATTR_TAG_ID = TabAttributeTagId;

  private static readonly INSTANCE = new TagService();

  public static getInstance(): TagService {
    return TagService.INSTANCE;
  }

  public readonly onChanged = new EventSink<void>();
  public readonly tagDirectory = TagDirectory.getInstance();

  private readonly _tabAttributeProvieder = new TabAttributeProvider();
  private readonly _tagChangedTopic = new BroadcastTopic<void>('tag.changed');

  private constructor() {
    this._tagChangedTopic.addListener(() => {
      this.onChanged.dispatch();
    });
  }

  private notifyChanged(): void {
    this._tagChangedTopic.broadcast();
    this.onChanged.dispatch();
  }

  public async getTagForTab(tab: DummyTab): Promise<TagType | undefined> {
    const attributes = (await this._tabAttributeProvieder.getAttributeSets([tab]))[0] as ExtensibleAttributeSet<DummyTab>;
    const tagId = attributes.getAttribute(TagService.ATTR_TAG_ID);
    if (null == tagId) {
      return undefined;
    }
    const tag = await this.tagDirectory.getTag(tagId);
    return tag;
  }

  public async setTagIdForTab(tab: DummyTab, tagId: number | null): Promise<void> {
    if (null == tagId) {
      tagId = 0;
    }
    // 0 means no tag.
    if (0 != tagId) {
      const tag = await this.tagDirectory.getTag(tagId);
      if (null == tag) {
        throw new Error(`Tag ${tagId} does not exist.`);
      }
    }
    const attributes = (await this._tabAttributeProvieder.getAttributeSets([tab]))[0] as ExtensibleAttributeSet<DummyTab>;
    attributes.setAttribute(TagService.ATTR_TAG_ID, tagId);
    await this._tabAttributeProvieder.saveAttributeSets([attributes]);
    this.notifyChanged();
  }

  public async getTagForTabId(tabId: number): Promise<TagType | undefined> {
    const tab = { id: tabId } as DummyTab;
    return this.getTagForTab(tab);
  }

  public async setTagIdForTabId(tabId: number, tagId: number | null): Promise<void> {
    const tab = { id: tabId } as DummyTab;
    return this.setTagIdForTab(tab, tagId);
  }

  public async deleteTag(tagId: number): Promise<void> {
    await this.tagDirectory.removeTagFromDirectory(tagId);
    const browserTabs = await browser.tabs.query({});
    const tabs = browserTabs.map((browserTab) => new CompatTab(browserTab));
    const tabAttributeMap = await TabAttributeMap.create(tabs);
    for (const tabId of tabAttributeMap.getTabIds()) {
      const foundTagId = tabAttributeMap.getTagIdForTab(tabId);
      if (foundTagId == tagId) {
        await this.setTagIdForTabId(tabId, 0);
      }
    }
  }
}

ServiceRegistry.getInstance().registerService('TagService', TagService.getInstance());
