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

import { DisplayedContainer } from 'weeg-containers';

import * as i18n from '../../legacy-lib/modules/i18n';

const renderButton = (tooltipText: string, name: string, iconUrl: string, useIconMask: boolean, maskColor = '#000000', aContainerElement: HTMLButtonElement | null = null) => {
  const containerElement = aContainerElement ?? document.createElement('button');
  containerElement.classList.add('container-button');
  containerElement.textContent = '';
  containerElement.title = tooltipText;

  const containerIconElement = document.createElement('span');
  containerIconElement.classList.add('container-button-icon');
  const containerLabelElement = document.createElement('span');
  containerLabelElement.classList.add('container-button-label');
  containerElement.append(containerIconElement, containerLabelElement);

  if (useIconMask) {
    containerIconElement.style.mask = `url(${iconUrl}) center center/75% no-repeat`;
    containerIconElement.style.backgroundColor = maskColor;
  } else {
    containerIconElement.style.background = `no-repeat center/75% url(${iconUrl})`;
  }

  containerLabelElement.textContent = name;
  return containerElement;
};

export const renderContainer = (displayedContainer: DisplayedContainer, aContainerElement: HTMLButtonElement | null = null) => {
  const tooltipText = i18n.getMessage('defaultContainerName', String(displayedContainer.cookieStore.userContextId));
  const iconUrl = displayedContainer.iconUrl || '/img/material-icons/category.svg';
  const containerElement = renderButton(tooltipText, displayedContainer.name, iconUrl, true, displayedContainer.colorCode || '#000', aContainerElement);
  return containerElement;
};

export const createPrivateBrowsingButton = () => {
  const tooltipText = i18n.getMessage('privateBrowsing');
  const name = tooltipText;
  const iconUrl = '/img/firefox-icons/private-browsing-icon.svg';
  const button = renderButton(tooltipText, name, iconUrl, false);
  return button;
};

export const createCreateContainerButton = () => {
  const tooltipText = i18n.getMessage('buttonNewContainer');
  const name = tooltipText;
  const iconUrl = '/img/firefox-icons/plus.svg';
  const button = renderButton(tooltipText, name, iconUrl, false);
  return button;
};

export const createTemporaryContainerButton = () => {
  const tooltipText = i18n.getMessage('buttonNewTemporaryContainer');
  const name = tooltipText;
  const iconUrl = '/img/material-icons/timelapse.svg';
  const button = renderButton(tooltipText, name, iconUrl, false);
  return button;
};
