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

import { Uint32 } from '../types';
import { UserContext } from './UserContext';

export class UserContextSortingProvider {
  private order: Uint32.Uint32[];
  public constructor() {
    this.order = [];
  }

  /**
   * Set the order of user contexts.
   */
  public setOrder(order: Uint32.Uint32[]): void {
    this.order = order;
  }

  /**
   * Returns the current order of user contexts.
   */
  public async getOrder(): Promise<Uint32.Uint32[]> {
    const userContexts = this.sort(await UserContext.getAll());
    return userContexts.map((userContext) => userContext.id);
  }

  public sort(userContexts: UserContext[]): UserContext[] {
    const copiedUserContexts = [... userContexts];
    copiedUserContexts.sort((a, b) => {
      const aIndex = this.order.indexOf(a.id);
      const bIndex = this.order.indexOf(b.id);
      if (aIndex < 0 && bIndex < 0) {
        return a.id - b.id;
      }
      if (aIndex < 0) {
        return 1;
      }
      if (bIndex < 0) {
        return -1;
      }
      return aIndex - bIndex;
    });
    return copiedUserContexts;
  }
}
