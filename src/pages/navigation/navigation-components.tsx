/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

import browser from 'webextension-polyfill';

export const Button = ({
  tooltipText,
  name,
  iconUrl,
  useIconMask,
  maskColor,
  onClick,
}: {
  tooltipText: string;
  name: string;
  iconUrl: string;
  useIconMask: boolean;
  onClick?: () => void;
  maskColor?: string;
}) => {
  // Without a container color, the icon takes the text color.
  const iconStyle = useIconMask
    ? { backgroundColor: maskColor || 'currentColor', mask: `url(${iconUrl}) center / contain no-repeat` }
    : { background: `no-repeat center / contain url(${iconUrl})` };
  return (
    <button className="container-button" title={tooltipText} onClick={() => onClick && onClick()}>
      <span className="container-button-icon" style={iconStyle}></span>
      <span className="container-button-label">{name}</span>
    </button>
  );
};

export const ContainerButton = ({
  displayedContainer,
  onClick,
}: {
  displayedContainer: DisplayedContainer;
  onClick?: () => void;
}) => {
  const tooltipText = browser.i18n.getMessage(
    'defaultContainerName',
    String(displayedContainer.cookieStore.userContextId)
  );
  const iconUrl = displayedContainer.iconUrl || '/img/firefox-icons/tab.svg';
  return (
    <Button
      onClick={onClick}
      tooltipText={tooltipText}
      iconUrl={iconUrl}
      useIconMask={true}
      maskColor={displayedContainer.colorCode || undefined}
      name={displayedContainer.name}
    ></Button>
  );
};

export const PrivateBrowsingButton = ({ onClick }: { onClick?: () => void }) => {
  const tooltipText = browser.i18n.getMessage('privateBrowsing');
  const iconUrl = '/img/firefox-icons/private-browsing-icon.svg';
  return (
    <Button
      onClick={onClick}
      tooltipText={tooltipText}
      name={tooltipText}
      iconUrl={iconUrl}
      useIconMask={false}
    ></Button>
  );
};

export const CreateContainerButton = ({ onClick }: { onClick?: () => void }) => {
  const tooltipText = browser.i18n.getMessage('buttonNewContainer');
  const iconUrl = '/img/firefox-icons/plus.svg';
  return (
    <Button
      onClick={onClick}
      tooltipText={tooltipText}
      name={tooltipText}
      iconUrl={iconUrl}
      useIconMask={true}
    ></Button>
  );
};

export const TemporatyContainerButton = ({ onClick }: { onClick?: () => void }) => {
  const tooltipText = browser.i18n.getMessage('buttonNewTemporaryContainer');
  const iconUrl = '/img/firefox-icons/history.svg';
  return (
    <Button
      onClick={onClick}
      tooltipText={tooltipText}
      name={tooltipText}
      iconUrl={iconUrl}
      useIconMask={true}
    ></Button>
  );
};
