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
import { CtgFrameLayoutElement } from '../components/ctg/ctg-frame-layout';

export class PopupCommandHandler {
  private readonly _frameLayout: CtgFrameLayoutElement;
  private readonly _commandListener: (command: string) => void;

  public constructor(frameLayout: CtgFrameLayoutElement) {
    this._frameLayout = frameLayout;
    this._commandListener = async (command) => {
      try {
        switch (command) {
          case 'open_windows_view': {
            frameLayout.activateFragment('fragment-windows');
            break;
          }

          case 'open_containers_view': {
            frameLayout.activateFragment('fragment-containers');
            break;
          }

          case 'open_sites_view': {
            frameLayout.activateFragment('fragment-sites');
            break;
          }

          case 'open_help_view': {
            frameLayout.activateFragment('fragment-help');
            break;
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
  }

  public start(): void {
    browser.commands.onCommand.addListener(this._commandListener);
  }

  public stop(): void {
    browser.commands.onCommand.removeListener(this._commandListener);
  }
}
