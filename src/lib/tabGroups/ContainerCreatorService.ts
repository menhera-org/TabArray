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

import { BackgroundService } from 'weeg-utils';

import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { ServiceRegistry } from '../ServiceRegistry';
import { CompatConsole } from '../console/CompatConsole';

type MessageType = {
  cookieStoreId?: string;
  name: string;
  color: string;
  icon: string;
};

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();

const containerCreate = async (name: string, color: string, icon: string): Promise<string> => {
  console.debug('container_create: name=%s, color=%s, icon=%s', name, color, icon);
  const contextualIdentity = await contextualIdentityFactory.create({name, color, icon});
  return contextualIdentity.cookieStore.id;
};

const containerUpdate = async (name: string, color: string, icon: string, cookieStoreId: string): Promise<string> => {
  console.debug('container_update: name=%s, color=%s, icon=%s, cookieStoreId=%s', name, color, icon, cookieStoreId);
  await contextualIdentityFactory.setParams(cookieStoreId, {name, color, icon});
  return cookieStoreId;
};

export class ContainerCreatorService extends BackgroundService<MessageType, string> {
  public override getServiceName(): string {
    return 'ContainerCreatorService';
  }

  protected override initializeBackground(): void {
    // nothing to do
  }

  protected override execute(input: MessageType): Promise<string> {
    if (null != input.cookieStoreId) {
      return containerUpdate(input.name, input.color, input.icon, input.cookieStoreId);
    }
    return containerCreate(input.name, input.color, input.icon);
  }

  public create(name: string, color: string, icon: string): Promise<string> {
    return this.call({name, color, icon});
  }

  public update(cookieStoreId: string, name: string, color: string, icon: string): Promise<string> {
    return this.call({cookieStoreId, name, color, icon});
  }
}

ServiceRegistry.getInstance().registerService('ContainerCreatorService', ContainerCreatorService.getInstance<ContainerCreatorService>());
