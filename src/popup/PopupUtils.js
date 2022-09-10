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
import { OriginAttributes } from '../frameworks/tabGroups';
import { TabGroup } from '../frameworks/tabGroups';

export const renderTab = (tab) => {
  const tabElement = document.createElement('li');
  tabElement.title = tab.url;
  tabElement.classList.add('tab');
  const tabPinButton = document.createElement('button');
  tabPinButton.classList.add('tab-pin-button');
  if (tab.pinned) {
    tabPinButton.title = browser.i18n.getMessage('tooltipTabUnpinButton');
  } else {
    tabPinButton.title = browser.i18n.getMessage('tooltipTabPinButton');
  }
  tabElement.append(tabPinButton);
  tabPinButton.addEventListener('click', (ev) => {
    ev.stopImmediatePropagation();
    if (tab.pinned) {
      tab.unpin().catch((e) => {
        console.error(e);
      });
    } else {
      tab.pin().catch((e) => {
        console.error(e);
      });
    }
  });
  const tabIconElement = document.createElement('img');
  tabIconElement.classList.add('tab-icon');
  let iconUrl = tab.favIconUrl;
  if (!iconUrl) {
    iconUrl = '/img/transparent.png';
  }
  tabIconElement.src = iconUrl;
  tabIconElement.addEventListener('error', ev => {
    ev.target.classList.add('img-error');
    ev.target.src = '/img/transparent.png';
  });
  tabElement.append(tabIconElement);
  const tabLabelElement = document.createElement('div');
  tabLabelElement.classList.add('tab-label');
  tabElement.append(tabLabelElement);
  tabLabelElement.textContent = tab.title;
  const tabCloseButton = document.createElement('button');
  tabCloseButton.classList.add('tab-close-button');
  tabCloseButton.title = browser.i18n.getMessage('buttonTabClose');
  tabElement.append(tabCloseButton);
  tabCloseButton.addEventListener('click', (ev) => {
    ev.stopImmediatePropagation();
    tab.close().catch((e) => {
      console.error(e);
    });
  });
  if (tab.pinned) {
    tabElement.classList.add('tab-pinned');
  } else if (tab.hidden) {
    tabElement.classList.add('tab-hidden');
  } else {
    tabElement.classList.add('tab-visible');
  }
  if (tab.discarded) {
    tabElement.classList.add('tab-discarded');
  }
  if (tab.active) {
    tabElement.classList.add('tab-active');
  }

  tabElement.addEventListener('click', (_ev) => {
    tab.focus().then(() => {
      window.close();
    }).catch((e) => {
      console.error(e);
    });
  });

  const {userContextId} = tab;
  const container = StateManager.getUserContext(userContextId);
  if (container && container.id != 0) {
    tabElement.style.borderColor = container.colorCode;
  }
  return tabElement;
};

/**
 *
 * @param {number} userContextId
 * @param {{mode: 'window', windowId: number} | {mode: 'site', site: string}} details
 * @returns {HTMLLIElement}
 */
export const renderContainerHeading = (userContextId, details) => {
  const container = StateManager.getUserContext(userContextId);
  const containerElement = document.createElement('li');
  containerElement.dataset.name = container.name;
  containerElement.classList.add('container');
  if (!userContextId) {
    containerElement.classList.add('container-default');
  }
  const visibilityToggleButton = document.createElement('button');
  visibilityToggleButton.classList.add('container-visibility-toggle');
  containerElement.append(visibilityToggleButton);
  visibilityToggleButton.disabled = true;
  const containerIcon = document.createElement('div');
  const iconUrl = container.iconUrl || '/img/category_black_24dp.svg';
  containerIcon.style.mask = `url(${iconUrl}) center center/contain no-repeat`;
  containerIcon.style.backgroundColor = container.colorCode || '#000';
  containerIcon.classList.add('container-icon');
  containerElement.append(containerIcon);
  const containerLabel = document.createElement('div');
  containerElement.append(containerLabel);
  containerLabel.classList.add('container-label');
  containerLabel.textContent = container.name;
  const closeContainerButton = document.createElement('button');
  containerElement.append(closeContainerButton);
  closeContainerButton.classList.add('close-container-button');
  closeContainerButton.title = browser.i18n.getMessage('tooltipContainerCloseAll');
  switch (details.mode) {
    case 'window': {
      const {windowId} = details;
      closeContainerButton.addEventListener('click', () => {
        containers.closeAllTabsOnWindow(userContextId, windowId).catch((e) => {
          console.error(e);
        });
      });
      break;
    }
    case 'site': {
      const {site} = details;
      closeContainerButton.addEventListener('click', () => {
        const originAttributes = new OriginAttributes(site, userContextId);
        TabGroup.createTabGroup(originAttributes).then((tabGroup) => {
          return tabGroup.tabList.closeTabs();
        }).catch((e) => {
          console.error(e);
        });
      });
      break;
    }
    default: {
      closeContainerButton.disabled = true;
    }
  }

  return containerElement;
};
