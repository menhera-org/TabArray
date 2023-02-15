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
import { OriginAttributes } from '../frameworks/tabGroups';
import { UserContext } from '../frameworks/tabGroups';
import { Uint32 } from '../frameworks/types';
import { UserContextService } from '../userContexts/UserContextService';
import { PrivateBrowsingService } from '../frameworks/tabs';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';
import { ContentStorageStatistics } from './ContentStorageStatistics';
import { ViewRefreshHandler } from '../frameworks/rendering/ViewRefreshHandler';

const userContextService = UserContextService.getInstance();
const privateBrowsingService = PrivateBrowsingService.getInstance();
const userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();
const contentStorageStatistics = new ContentStorageStatistics();
const cookieProvider = contentStorageStatistics.cookieProvider;

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

const getSelectedOriginAttributes = () => {
  return OriginAttributes.fromString(selectContainers.value);
};

const render = async () => {
  await userContextSortingOrderStore.initialized;
  const userContexts = userContextSortingOrderStore.sort((await UserContext.getAll(false)).map((userContext) => userContextService.fillDefaultValues(userContext)));
  const containers: Map<OriginAttributes, string> = new Map;
  for (const userContext of userContexts) {
    containers.set(new OriginAttributes('', userContext.id, 0 as Uint32.Uint32), userContext.name);
  }

  // private browsing.
  const privateBrowsingName = browser.i18n.getMessage('privateBrowsing');
  containers.set(new OriginAttributes('', 0 as Uint32.Uint32, 1 as Uint32.Uint32), privateBrowsingName);

  selectContainers.textContent = '';
  for (const [originAttributes, name] of containers) {
    const option = document.createElement('option');
    option.value = originAttributes.toString();
    option.textContent = name;
    selectContainers.appendChild(option);
  }

  const selectedOriginAttributes = getSelectedOriginAttributes();
  await containerViewRefreshHandler.render(selectedOriginAttributes);
};

const renderContainer = async (originAttributes: OriginAttributes) => {
  const firstPartyDomains = await contentStorageStatistics.getFirstPartyDomainList(originAttributes.cookieStoreId);
  cookieDomains.textContent = '';

  for (const firstPartyDomain of firstPartyDomains) {
    const domains = await contentStorageStatistics.getDomainList(originAttributes.cookieStoreId, firstPartyDomain);

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
        await cookieProvider.removeDataForDomain(originAttributes.cookieStoreId, domain);
        await contentStorageStatistics.removeOriginStatistics(originAttributes.cookieStoreId, firstPartyDomain, `http://${domain}`);
        await contentStorageStatistics.removeOriginStatistics(originAttributes.cookieStoreId, firstPartyDomain, `https://${domain}`);
        console.log(`Removed browsing data for: *://${domain}^userContextId=${originAttributes.userContextId}&privateBrowsingId=${originAttributes.privateBrowsingId}`);
        renderContainer(originAttributes);
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
  const selectedOriginAttributes = getSelectedOriginAttributes();
  containerViewRefreshHandler.renderInBackground(selectedOriginAttributes);
});

buttonContainerClearCookie.addEventListener('click', async () => {
  const selectedOriginAttributes = getSelectedOriginAttributes();
  if (selectedOriginAttributes.isPrivateBrowsing()) {
    await privateBrowsingService.clearBrowsingData();
  } else if (selectedOriginAttributes.userContextId != null) {
    const userContext = UserContext.createIncompleteUserContext(selectedOriginAttributes.userContextId);
    await userContext.removeBrowsingData();
  }
  containerViewRefreshHandler.renderInBackground(selectedOriginAttributes);
});

contentStorageStatistics.onChanged.addListener(() => {
  const selectedOriginAttributes = getSelectedOriginAttributes();
  containerViewRefreshHandler.renderInBackground(selectedOriginAttributes);
});

render().catch((e) => {
  console.error(e);
});
