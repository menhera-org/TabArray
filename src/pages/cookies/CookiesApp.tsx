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
import { Fragment, useEffect, useState } from 'react';
import { CookieStore } from 'weeg-containers';

import { TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';
import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';
import { TabGroupService } from '../../lib/tabGroups/TabGroupService';
import { CompatConsole } from '../../lib/console/CompatConsole';

import { ContentStorageStatistics } from '../../lib/cookies/ContentStorageStatistics';
import { confirmAsync } from '../../frontend/dialogs/showDialog';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const logError = (e: unknown) => console.error(e);
const contentStorageStatistics = new ContentStorageStatistics();
const message = (name: string) => browser.i18n.getMessage(name);

export type SiteData = { firstPartyDomain: string; domains: string[] };

/** The sites that stored data in a container, grouped by first-party domain. */
const loadSiteData = async (cookieStoreId: string): Promise<SiteData[]> => {
  const result: SiteData[] = [];
  for (const firstPartyDomain of await contentStorageStatistics.getFirstPartyDomainList(cookieStoreId)) {
    result.push({
      firstPartyDomain,
      domains: await contentStorageStatistics.getDomainList(cookieStoreId, firstPartyDomain),
    });
  }
  return result;
};

/** The containers in the user's order, as [cookieStoreId, name]. */
const loadContainers = async (): Promise<[string, string][]> => {
  const snapshot = await TabGroupDirectory.getInstance().getSnapshot();
  const containers = await DisplayedContainerService.getInstance().getDisplayedContainers();
  snapshot.sortDisplayedContainers(containers);
  return containers.map((container) => [container.cookieStore.id, container.name]);
};

const removeSiteData = async (cookieStore: CookieStore, firstPartyDomain: string, domain: string) => {
  await contentStorageStatistics.cookieProvider.removeDataForDomain(cookieStore.id, domain);
  await contentStorageStatistics.removeOriginStatistics(cookieStore.id, firstPartyDomain, `http://${domain}`);
  await contentStorageStatistics.removeOriginStatistics(cookieStore.id, firstPartyDomain, `https://${domain}`);
  console.log(
    `Removed browsing data for: *://${domain}^userContextId=${cookieStore.userContextId}&privateBrowsingId=${cookieStore.privateBrowsingId}`
  );
};

/** The Cookies page: the sites that stored data in a container, each removable, or all at once. */
export const CookiesApp = () => {
  const [containers, setContainers] = useState<[string, string][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [siteData, setSiteData] = useState<SiteData[]>([]);
  // Bumped after this page removes data, to load the container's sites again.
  const [reloads, setReloads] = useState(0);
  const reload = () => setReloads((n) => n + 1);
  const cookieStoreId = selected ?? containers[0]?.[0] ?? null;

  useEffect(() => {
    loadContainers().then(setContainers, logError);
  }, []);
  useEffect(() => {
    if (cookieStoreId == null) return;
    // Only the load started last shows, and none once another container is picked: loads can finish
    // out of order.
    let latest = 0;
    let shown = true;
    const load = () => {
      const current = ++latest;
      loadSiteData(cookieStoreId).then((data) => {
        if (shown && current == latest) setSiteData(data);
      }, logError);
    };
    load();
    contentStorageStatistics.onChanged.addListener(load);
    return () => {
      shown = false;
      contentStorageStatistics.onChanged.removeListener(load);
    };
  }, [cookieStoreId, reloads]);

  return (
    <>
      <h1 id="headingCookies">{message('headingCookies')}</h1>
      <div id="main">
        <table id="cookies">
          <thead>
            <tr>
              <th colSpan={2}>
                <select
                  id="selectContainers"
                  value={cookieStoreId ?? ''}
                  onChange={(ev) => setSelected(ev.currentTarget.value)}
                >
                  {containers.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>{' '}
                <button
                  id="buttonContainerClearCookie"
                  className="ctg-button destructive"
                  onClick={() => {
                    if (cookieStoreId == null) return;
                    const name = containers.find(([id]) => id == cookieStoreId)?.[1] ?? '';
                    confirmAsync(browser.i18n.getMessage('confirmContainerClearCookie', name))
                      .then(async (confirmed) => {
                        if (!confirmed) return;
                        await TabGroupService.getInstance().removeBrowsingDataForTabGroupId(cookieStoreId);
                        reload();
                      })
                      .catch(logError);
                  }}
                >
                  {message('buttonContainerClearCookie')}
                </button>
              </th>
            </tr>
            <tr>
              <th id="cookiesHeadingDomain">{message('cookiesHeadingDomain')}</th>
              <th id="cookiesHeadingActions">{message('cookiesHeadingActions')}</th>
            </tr>
          </thead>
          <tbody id="cookieDomains">
            {siteData.map(({ firstPartyDomain, domains }) => (
              <Fragment key={firstPartyDomain}>
                <tr>
                  <td colSpan={2} className="first-party-domain">{`^firstPartyDomain=${firstPartyDomain}`}</td>
                </tr>
                {domains.map((domain) => (
                  <tr key={domain}>
                    <td className="domain">{domain}</td>
                    <td className="actions">
                      <button
                        className="ctg-icon-button delete"
                        onClick={() => {
                          if (cookieStoreId == null) return;
                          removeSiteData(new CookieStore(cookieStoreId), firstPartyDomain, domain).then(
                            reload,
                            logError
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
