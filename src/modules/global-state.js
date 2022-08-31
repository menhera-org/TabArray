// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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

export const getStateManager = async () => {
  const background = await browser.runtime.getBackgroundPage();
  if (!background) {
    throw new Error('Invalid background page');
  }
  while (!background.StateManager) {
    await new Promise((res) => setTimeout(() => res(), 100));
  }
  const {StateManager} = background;
  if (!StateManager.initialized) {
    await new Promise((res) => StateManager.addEventListener('initialized', (ev) => {
      res();
    }));
  }
  return StateManager;
};

export const getFirstpartyManager = async () => {
  const background = await browser.runtime.getBackgroundPage();
  if (!background) {
    throw new Error('Invalid background page');
  }
  while (!background.FirstpartyManager) {
    await new Promise((res) => setTimeout(() => res(), 100));
  }
  const {FirstpartyManager} = background;
  return FirstpartyManager;
};
