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

import { MessagingService } from 'weeg-utils';

import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';

const contextualIdentityService = ContextualIdentityService.getInstance();
const messagingService = MessagingService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();

const containerCreate = async (name: string, color: string, icon: string): Promise<string> => {
  console.debug('container_create: name=%s, color=%s, icon=%s', name, color, icon);
  const contextualIdentity = await contextualIdentityFactory.create({name, color, icon});
  return contextualIdentity.cookieStore.id;
};

const containerUpdate = async (name: string, color: string, icon: string, cookieStoreId: string): Promise<void> => {
  console.debug('container_update: name=%s, color=%s, icon=%s, cookieStoreId=%s', name, color, icon, cookieStoreId);
  await contextualIdentityFactory.setParams(cookieStoreId, {name, color, icon});
};

messagingService.addListener('container_create', async (message) => {
  if (null == message || typeof message != 'object' || !('name' in message) || !('color' in message) || !('icon' in message)) return;
  const {name, color, icon} = message;
  const cookieStoreId = await containerCreate(name as string, color as string, icon as string);
  return cookieStoreId;
});

messagingService.addListener('container_update', async (message) => {
  if (null == message || typeof message != 'object' || !('name' in message) || !('color' in message) || !('icon' in message) || !('cookieStoreId' in message)) return;
  const {name, color, icon, cookieStoreId} = message;
  await containerUpdate(name as string, color as string, icon as string, cookieStoreId as string);
  return cookieStoreId;
});
