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

import { PopupUtils } from './PopupUtils';

const utils = new PopupUtils();
const searchBox = utils.queryElementNonNull<HTMLInputElement>('#search');


export const cancelHandler = () => {
  // none.
};

export const okHandler = () => {
  const activeElement = utils.getActiveElement();
  if (!activeElement) return;
  activeElement.click();
};

const getSitesView = () => {
  return document.querySelector<HTMLElement>('#sites')?.dataset.activeContent ?? 'sites';
};

const arrowUpHandlerInner = (activeElement: HTMLElement | null, buttons: HTMLElement[]) => {
  const index = activeElement ? buttons.indexOf(activeElement) : -1;
  if (index <= 0) {
    buttons[buttons.length - 1]?.focus();
  } else {
    buttons[index - 1]?.focus();
  }
  return true;
};

const arrowUpHandler = () => {
  const activeElement = utils.getActiveElement();
  const mainButtons = [... document.querySelectorAll('#main menulist-container, #main menulist-tab')] as HTMLElement[];
  const windowsButtons = [... document.querySelectorAll('#windows-inner > button, #windows menulist-container, #windows menulist-tab')] as HTMLElement[];
  const sitesButtons = [... document.querySelectorAll('#sites-pane-top > button')] as HTMLElement[];
  const sitesDetailsButtons = [... document.querySelectorAll('#sites-pane-details menulist-container, #sites-pane-details menulist-tab')] as HTMLElement[];
  switch (location.hash) {
    case '#main': {
      const index = activeElement ? mainButtons.indexOf(activeElement) : -1;
      if (index <= 0) {
        searchBox.focus();
      } else {
        mainButtons[index - 1]?.focus();
      }
      return true;
    }
    case '#windows': {
      return arrowUpHandlerInner(activeElement, windowsButtons);
    }
    case '#sites': {
      return getSitesView() === 'sites' ? arrowUpHandlerInner(activeElement, sitesButtons) : arrowUpHandlerInner(activeElement, sitesDetailsButtons);
    }
  }
  return false;
};

const arrowDownHandlerInner = (activeElement: HTMLElement | null, buttons: HTMLElement[]) => {
  const index = activeElement ? buttons.indexOf(activeElement) : -1;
  if (index < 0 || index >= buttons.length - 1) {
    buttons[0]?.focus();
  } else {
    buttons[index + 1]?.focus();
  }
  return true;
};

const arrowDownHandler = () => {
  const activeElement = utils.getActiveElement();
  const mainButtons = [... document.querySelectorAll('#main menulist-container, #main menulist-tab')] as HTMLElement[];
  const windowsButtons = [... document.querySelectorAll('#windows-inner > button, #windows menulist-container, #windows menulist-tab')] as HTMLElement[];
  const sitesButtons = [... document.querySelectorAll('#sites-pane-top > button')] as HTMLElement[];
  const sitesDetailsButtons = [... document.querySelectorAll('#sites-pane-details menulist-container, #sites-pane-details menulist-tab')] as HTMLElement[];
  switch (location.hash) {
    case '#main': {
      const index = activeElement ? mainButtons.indexOf(activeElement) : -1;
      if (index < 0) {
        mainButtons[0]?.focus();
      } else if (index >= mainButtons.length - 1) {
        searchBox.focus();
      } else {
        mainButtons[index + 1]?.focus();
      }
      return true;
    }
    case '#windows': {
      return arrowDownHandlerInner(activeElement, windowsButtons);
    }
    case '#sites': {
      return getSitesView() === 'sites' ? arrowDownHandlerInner(activeElement, sitesButtons) : arrowDownHandlerInner(activeElement, sitesDetailsButtons);
    }
  }
  return false;
};

export const keyHandler = (ev: KeyboardEvent) => {
  if (ev.key == 'ArrowUp') {
    return arrowUpHandler();
  } else if (ev.key == 'ArrowDown') {
    return arrowDownHandler();
  }
  return false;
};
