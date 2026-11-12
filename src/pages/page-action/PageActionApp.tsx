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

import browser from 'webextension-polyfill';
import { ExtensionService } from 'weeg-utils';
import { CookieStore, DisplayedContainer } from 'weeg-containers';

import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';
import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';
import { CompatConsole } from '../../lib/console/CompatConsole';

import { useLoaded } from '../../frontend/useLoaded';

export type ContainerInfo = {
  cookieStoreId: string;
  name: string;
  iconUrl: string;
};

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

const currentBrowserTabPromise = browser.tabs
  .query({ active: true, currentWindow: true })
  .then((browserTabs) => browserTabs[0]);

/**
 * Where the tab can be reopened: no container, the containers in the user's order, and private
 * browsing when allowed; never where it already is.
 */
export const getContainerInfos = (
  containers: DisplayedContainer[],
  privateBrowsingAllowed: boolean,
  currentCookieStoreId: string | undefined
): ContainerInfo[] =>
  [
    { cookieStoreId: CookieStore.DEFAULT.id, name: browser.i18n.getMessage('noContainer'), iconUrl: '' },
    ...containers.map((container) => ({
      cookieStoreId: container.cookieStore.id,
      name: container.name,
      iconUrl: container.iconUrl,
    })),
    ...(privateBrowsingAllowed
      ? [
          {
            cookieStoreId: CookieStore.PRIVATE.id,
            name: browser.i18n.getMessage('privateBrowsing'),
            iconUrl: '/img/firefox-icons/private-browsing-icon.svg',
          },
        ]
      : []),
  ].filter((info) => info.cookieStoreId !== currentCookieStoreId);

const loadContainerInfos = async () => {
  const currentBrowserTab = await currentBrowserTabPromise;
  const containers = await ContextualIdentityService.getInstance().getFactory().getAll();
  (await TabGroupDirectory.getInstance().getSnapshot()).sortDisplayedContainers(containers);
  const privateBrowsingAllowed = await ExtensionService.getInstance().isAllowedInPrivateBrowsing();
  return getContainerInfos(containers, privateBrowsingAllowed, currentBrowserTab?.cookieStoreId);
};

const reopenIn = async (cookieStoreId: string) => {
  const browserTab = await currentBrowserTabPromise;
  if (!browserTab || null == browserTab.id || null == browserTab.windowId || null == browserTab.url) {
    console.warn('invalid browser tab', browserTab);
    return;
  }
  // this menu is never shown on non-HTTP tabs
  await ContainerTabOpenerService.getInstance<ContainerTabOpenerService>().reopenTabInContainer(
    browserTab.id,
    cookieStoreId,
    true
  );
};

/** The page action's panel: reopen the current tab in another container. */
export const PageActionApp = () => {
  const infos = useLoaded(loadContainerInfos);
  return (
    <>
      <h3 id="headingReopen">{browser.i18n.getMessage('headingReopen')}</h3>
      <hr />
      <div id="main">
        {infos?.map((info) => (
          <button
            key={info.cookieStoreId}
            className="container-button"
            onClick={() => {
              reopenIn(info.cookieStoreId).catch((e) => console.error(e));
            }}
          >
            {/* An icon without a source, as before, for No Container. */}
            <img className="container-icon" {...(info.iconUrl ? { src: info.iconUrl } : {})} />
            <span className="container-label">{info.name}</span>
          </button>
        ))}
      </div>
    </>
  );
};
