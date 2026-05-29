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

import browser from 'webextension-polyfill';
import { CookieStore } from 'weeg-containers';
import { ViewRefreshHandler } from 'weeg-utils';

import { TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';
import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';
import { TabGroupService } from '../../lib/tabGroups/TabGroupService';
import { CompatConsole } from '../../lib/console/CompatConsole';

import { ContentStorageStatistics } from '../../legacy-lib/cookies/ContentStorageStatistics';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const contentStorageStatistics = new ContentStorageStatistics();
const cookieProvider = contentStorageStatistics.cookieProvider;
const tabGroupDirectory = TabGroupDirectory.getInstance();
const displayedContainerService = DisplayedContainerService.getInstance();
const tabGroupService = TabGroupService.getInstance();

const selectContainers = document.querySelector('#selectContainers') as HTMLSelectElement;
const cookieDomains = document.querySelector('#cookieDomains') as HTMLTableSectionElement;
const headingCookies = document.querySelector('#headingCookies') as HTMLHeadingElement;
const cookiesHeadingDomain = document.querySelector('#cookiesHeadingDomain') as HTMLTableCellElement;
const cookiesHeadingActions = document.querySelector('#cookiesHeadingActions') as HTMLTableCellElement;
const buttonContainerClearCookie = document.querySelector('#buttonContainerClearCookie') as HTMLButtonElement;
if (!selectContainers || !cookieDomains || !headingCookies || !cookiesHeadingDomain || !cookiesHeadingActions || !buttonContainerClearCookie) {
  throw new Error('element is not found.');
}

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');
document.title = browser.i18n.getMessage('headingCookies');
headingCookies.textContent = browser.i18n.getMessage('headingCookies');
cookiesHeadingDomain.textContent = browser.i18n.getMessage('cookiesHeadingDomain');
cookiesHeadingActions.textContent = browser.i18n.getMessage('cookiesHeadingActions');
buttonContainerClearCookie.textContent = browser.i18n.getMessage('buttonContainerClearCookie');

const getSelectedCookieStore = () => {
  return new CookieStore(selectContainers.value);
};

const render = async () => {
  const tabGroupDirectorySnapshot = await tabGroupDirectory.getSnapshot();
  const displayedContainers = await displayedContainerService.getDisplayedContainers();
  tabGroupDirectorySnapshot.sortDisplayedContainers(displayedContainers);
  const containers: Map<CookieStore, string> = new Map;
  for (const displayedContainer of displayedContainers) {
    containers.set(displayedContainer.cookieStore, displayedContainer.name);
  }

  selectContainers.textContent = '';
  for (const [cookieStore, name] of containers) {
    const option = document.createElement('option');
    option.value = cookieStore.id;
    option.textContent = name;
    selectContainers.appendChild(option);
  }

  const selectedCookieStore = getSelectedCookieStore();
  await containerViewRefreshHandler.render(selectedCookieStore);
};

const renderContainer = async (cookieStore: CookieStore) => {
  const firstPartyDomains = await contentStorageStatistics.getFirstPartyDomainList(cookieStore.id);
  cookieDomains.textContent = '';

  for (const firstPartyDomain of firstPartyDomains) {
    const domains = await contentStorageStatistics.getDomainList(cookieStore.id, firstPartyDomain);

    {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.classList.add('first-party-domain');
      td.textContent = `^firstPartyDomain=${firstPartyDomain}`;
      tr.appendChild(td);
      cookieDomains.appendChild(tr);
    }

    for (const domain of domains) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = domain;
      td.classList.add('domain');
      const td2 = document.createElement('td');
      td2.classList.add('actions');
      const button = document.createElement('button');
      button.classList.add('delete');
      button.addEventListener('click', async () => {
        await cookieProvider.removeDataForDomain(cookieStore.id, domain);
        await contentStorageStatistics.removeOriginStatistics(cookieStore.id, firstPartyDomain, `http://${domain}`);
        await contentStorageStatistics.removeOriginStatistics(cookieStore.id, firstPartyDomain, `https://${domain}`);
        console.log(`Removed browsing data for: *://${domain}^userContextId=${cookieStore.userContextId}&privateBrowsingId=${cookieStore.privateBrowsingId}`);
        renderContainer(cookieStore);
      });
      td2.appendChild(button);
      tr.appendChild(td);
      tr.appendChild(td2);
      cookieDomains.appendChild(tr);
    }
  }
};

const containerViewRefreshHandler = new ViewRefreshHandler(renderContainer);

selectContainers.addEventListener('change', () => {
  const selectedCookieStore = getSelectedCookieStore();
  containerViewRefreshHandler.renderInBackground(selectedCookieStore);
});

buttonContainerClearCookie.addEventListener('click', async () => {
  const selectedCookieStore = getSelectedCookieStore();
  await tabGroupService.removeBrowsingDataForTabGroupId(selectedCookieStore.id);
  containerViewRefreshHandler.renderInBackground(selectedCookieStore);
});

contentStorageStatistics.onChanged.addListener(() => {
  const selectedCookieStore = getSelectedCookieStore();
  containerViewRefreshHandler.renderInBackground(selectedCookieStore);
});

render().catch((e) => {
  console.error(e);
});
