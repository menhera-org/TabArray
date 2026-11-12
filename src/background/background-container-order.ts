/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

/*
  Keeps containers sorted by name within each container group while that option is on (#377).
  The stored order is rewritten, so the popup, the sidebar, tab sorting and the tab bar's groups all follow it.
*/

import { config } from '../config/config';
import { CompatConsole } from '../lib/console/CompatConsole';
import { ContextualIdentityService } from '../lib/tabGroups/ContextualIdentityService';
import { TabGroupDirectory } from '../lib/tabGroups/TabGroupDirectory';
import { sortTabGroupsByName } from '../lib/tabGroups/sortTabGroupsByName';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const tabGroupDirectory = TabGroupDirectory.getInstance();
const contextualIdentityFactory = ContextualIdentityService.getInstance().getFactory();

const sortByName = async () => {
  if (!(await config['tab.groups.sortByName'].getValue())) return;
  const [value, identities] = await Promise.all([tabGroupDirectory.getValue(), contextualIdentityFactory.getAll()]);
  const names = new Map(identities.map((identity) => [identity.cookieStore.id, identity.name]));
  const sorted = sortTabGroupsByName(value, (tabGroupId) => names.get(tabGroupId) ?? value[tabGroupId]?.name ?? '');
  // Writing changes the directory again, which runs this once more and finds nothing to do.
  if (sorted) await tabGroupDirectory.setValue(sorted);
};

let running = false;
let rerun = false;
const update = () => {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  (async () => {
    do {
      rerun = false;
      await sortByName();
    } while (rerun);
  })()
    .catch((e) => {
      console.error(e);
    })
    .finally(() => {
      running = false;
    });
};

config['tab.groups.sortByName'].observe(update);
tabGroupDirectory.onChanged.addListener(update);
contextualIdentityFactory.onCreated.addListener(update);
contextualIdentityFactory.onUpdated.addListener(update);
