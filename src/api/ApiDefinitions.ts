// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
*/

import browser from 'webextension-polyfill';
import { UserContext } from '../frameworks/tabGroups';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';
import { UserContextService } from '../userContexts/UserContextService';

export type UserContextType = {
  id: number;
  name: string;
  icon: string;
  color: string;
  iconUrl: string;
  colorCode: string;
  cookieStoreId: string;
  index: number;
};

export const API_GET_CONTAINERS = 'get-containers';

const sortingOrderStore = UserContextSortingOrderStore.getInstance();
const userContextService = UserContextService.getInstance();

export const getContainers = async () => {
  const contexts = await UserContext.getAll();
  const sortedContexts = sortingOrderStore.sort(contexts.map((context) => userContextService.fillDefaultValues(context)));
  const result: UserContextType[] = [];
  for (const context of sortedContexts) {
    result.push({
      ... context,
      index: contexts.indexOf(context),
      cookieStoreId: context.cookieStoreId,
    });
  }
  return result;
};

browser.runtime.onMessageExternal.addListener(async (message, sender): Promise<unknown> => {
  console.log('message:', message, 'sender:', sender);
  if (!message) {
    throw new Error('message is null');
  }
  switch (message.type) {
    case API_GET_CONTAINERS: {
      return getContainers();
    }
    default: {
      throw new Error('unknown message type');
    }
  }
});
