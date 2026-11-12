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
import { HostnameService } from 'weeg-domains';

import { BrowserStateDao } from '../../../lib/states/BrowserStateDao';
import { TabDao } from '../../../lib/states/TabDao';
import { IndexTabService } from '../../../lib/tabs/IndexTabService';

import { TabFavicon } from './TabFavicon';
import { FOCUSABLE } from './focus';

import styles from './SitesView.module.css';

export type SiteSummary = {
  domain: string;
  tabCount: number;
  /** The most recently used tab of the site. */
  favIconUrl: string;
  title: string;
};

/** One entry per site, in the usual domain order. Index tabs are not counted. */
export const getSiteSummaries = (browserState: BrowserStateDao): SiteSummary[] => {
  const indexTabService = IndexTabService.getInstance();
  const domains = HostnameService.getInstance().sortDomains(Object.keys(browserState.tabIdsBySite));
  const summaries: SiteSummary[] = [];
  for (const domain of domains) {
    const tabs = indexTabService.filterOutIndexTabs(
      (browserState.tabIdsBySite[domain] ?? []).map((tabId) => TabDao.toCompatTab(browserState.tabs[tabId] as TabDao))
    );
    // A site with only index tabs has nothing to show (the old code threw here).
    if (tabs.length == 0) continue;
    const lastAccessedTab = tabs.reduce((a, b) => (a.lastAccessed > b.lastAccessed ? a : b));
    summaries.push({
      domain,
      tabCount: tabs.length,
      favIconUrl: lastAccessedTab.favIconUrl,
      title: lastAccessedTab.title,
    });
  }
  return summaries;
};

type SitesViewProps = {
  sites: SiteSummary[];
  onSiteClick: (domain: string) => void;
  onSiteClose: (domain: string) => void;
};

export const SitesView = ({ sites, onSiteClick, onSiteClose }: SitesViewProps) => (
  <>
    {sites.map((site) => (
      <div className={styles.site} key={site.domain}>
        <button className={styles.siteButton} onClick={() => onSiteClick(site.domain)} {...FOCUSABLE}>
          <TabFavicon className={styles.tabIcon} url={site.favIconUrl} />
          <span className={styles.siteText}>
            <span className={styles.siteLabel}>{site.domain || '(null)'}</span>
            <span className={styles.tabLabel}>{site.title}</span>
          </span>
          <span className={styles.tabCount}>{site.tabCount}</span>
        </button>
        <button
          className={`ctg-icon-button ${styles.closeButton}`}
          title={browser.i18n.getMessage('tooltipSiteCloseAll')}
          onClick={() => onSiteClose(site.domain)}
        />
      </div>
    ))}
  </>
);
