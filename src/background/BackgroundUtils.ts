// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import browser from 'webextension-polyfill';
import { Uint32 } from '../frameworks/types';
import * as containers from '../modules/containers';
import { PromiseUtils } from '../frameworks/utils';
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';

export class BackgroundUtils {
  private static readonly userContextVisibilityService = UserContextVisibilityService.getInstance();

  public async reopenNewTabInContainer(tabId: number, userContextId: Uint32.Uint32, windowId: number) {
    await PromiseUtils.sleep(100);
    if (await BackgroundUtils.userContextVisibilityService.isIndexTab(tabId)) {
      console.log('Ignoring an index tab: ', tabId);
      return;
    }
    await browser.tabs.remove(tabId);
    await containers.openNewTabInContainer(userContextId, windowId);
  }
}
