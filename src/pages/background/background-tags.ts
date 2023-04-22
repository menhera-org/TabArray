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
import { CompatTab } from 'weeg-tabs';

import { TagService } from '../../lib/tabGroups/TagService';

const tagService = TagService.getInstance();

// new tabs inherit the tag of their opener
browser.tabs.onCreated.addListener(async (browserTab) => {
  try {
    if (null == browserTab.openerTabId) return;
    const tab = new CompatTab(browserTab);
    const openerBrowserTab = await browser.tabs.get(browserTab.openerTabId);
    const openerTab = new CompatTab(openerBrowserTab);
    const tag = await tagService.getTagForTab(openerTab);
    if (tag) {
      await tagService.setTagIdForTab(tab, tag.tagId);
    }
  } catch (e) {
    console.error(e);
  }
});
