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

import { TabAttributeProvider, CompatTab } from "weeg-tabs";
import { ExtensibleAttributeSet } from "weeg-utils";
import { EventSink } from "weeg-events";

import { ServiceRegistry } from "../ServiceRegistry";
import { TagType, TagDirectory } from "./TagDirectory";
import { TabAttributeMap } from "./TabAttributeMap";
import { BroadcastTopic } from "../BroadcastTopic";

export class TagService {
  public static readonly ATTR_TAG_ID = TabAttributeMap.ATTR_TAG_ID;

  private static readonly INSTANCE = new TagService();

  public static getInstance(): TagService {
    return TagService.INSTANCE;
  }

  public readonly onChanged = new EventSink<void>();

  private readonly _tabAttributeProvieder = new TabAttributeProvider();
  private readonly _tagDirectory = new TagDirectory();
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

  public async getTagForTab(tab: CompatTab): Promise<TagType | undefined> {
    const attributes = (await this._tabAttributeProvieder.getAttributeSets([tab]))[0] as ExtensibleAttributeSet<CompatTab>;
    const tagId = attributes.getAttribute(TagService.ATTR_TAG_ID);
    if (null == tagId) {
      return undefined;
    }
    const tag = await this._tagDirectory.getTag(tagId);
    return tag;
  }

  public async setTagIdForTab(tab: CompatTab, tagId: number | null): Promise<void> {
    if (null == tagId) {
      tagId = 0;
    }
    // 0 means no tag.
    if (0 != tagId) {
      const tag = await this._tagDirectory.getTag(tagId);
      if (null == tag) {
        throw new Error(`Tag ${tagId} does not exist.`);
      }
    }
    const attributes = (await this._tabAttributeProvieder.getAttributeSets([tab]))[0] as ExtensibleAttributeSet<CompatTab>;
    attributes.setAttribute(TagService.ATTR_TAG_ID, tagId);
    await this._tabAttributeProvieder.saveAttributeSets([attributes]);
    this.notifyChanged();
  }
}

ServiceRegistry.getInstance().registerService('TagService', TagService.getInstance());
