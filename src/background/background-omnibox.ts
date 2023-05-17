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

import browser from "webextension-polyfill";
import { CookieStore, DisplayedContainer } from "weeg-containers";

import { CompatConsole } from "../lib/console/CompatConsole";
import { DisplayedContainerService } from "../lib/tabGroups/DisplayedContainerService";
import { ContainerHistoryService } from "../lib/history/ContainerHistoryService";
import { ExtensionPageService } from "../lib/ExtensionPageService";
import { ContainerTabOpenerService } from "../lib/tabGroups/ContainerTabOpenerService";

import { OPEN_CONTAINER_PAGE, PANORAMA_PAGE } from "../defs";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

const displayedContainerService = DisplayedContainerService.getInstance();
const containerHistoryService = ContainerHistoryService.getInstance<ContainerHistoryService>();
const extensionPageService = ExtensionPageService.getInstance();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();

const DEFAULT_SUGGESTION = browser.i18n.getMessage("searchPlaceholder");

const makeSugesstion = (container: DisplayedContainer): browser.Omnibox.SuggestResult => {
  const cookieStoreId = container.cookieStore.id;
  const url = new URL(OPEN_CONTAINER_PAGE, location.href);
  url.searchParams.set("cookieStoreId", cookieStoreId);
  return {
    content: url.href,
    deletable: false,
    description: container.name,
  };
};

const getPanoramaGridSuggestion = (): browser.Omnibox.SuggestResult => {
  const url = new URL(PANORAMA_PAGE, location.href);
  const description = browser.i18n.getMessage("panoramaGrid");
  return {
    content: url.href,
    deletable: false,
    description,
  };
};

const tryConstructUrl = (url: string, base?: string): URL | null => {
  try {
    return new URL(url, base);
  } catch (e) {
    return null;
  }
};

browser.omnibox.setDefaultSuggestion({
  description: DEFAULT_SUGGESTION,
});

browser.omnibox.onInputStarted.addListener(() => {
  console.debug('omnibox.onInputStarted');
});

browser.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const [displayedContainers, latestCookieStoreIds] = await Promise.all([
    displayedContainerService.getDisplayedContainers(),
    containerHistoryService.getHistory(),
  ]);
  displayedContainers.sort((a, b) => {
    const aIndex = latestCookieStoreIds.indexOf(a.cookieStore.id);
    const bIndex = latestCookieStoreIds.indexOf(b.cookieStore.id);
    return bIndex - aIndex;
  });
  const searchWords = text.split(/\s+/u);
  let filteredDisplayedContainers = displayedContainers;
  for (const searchWord of searchWords) {
    filteredDisplayedContainers = filteredDisplayedContainers.filter((container) => {
      return container.name.includes(searchWord);
    });
  }

  const firstFiveContainers = filteredDisplayedContainers.slice(0, 5);
  const containerSugesstions = firstFiveContainers.map(makeSugesstion);
  const panoramaGridSuggestion = getPanoramaGridSuggestion();
  const suggestions = [panoramaGridSuggestion, ...containerSugesstions];
  suggest(suggestions);
});

browser.omnibox.onInputEntered.addListener((text) => {
  const url = tryConstructUrl(text);
  if (null == url) {
    console.info('Invalid input entered on omnibox: %s', text);
    return;
  }
  if (url.pathname == PANORAMA_PAGE) {
    extensionPageService.openInBackground(ExtensionPageService.PANORAMA);
    return;
  }
  const cookieStoreId = url.searchParams.get("cookieStoreId") || CookieStore.DEFAULT.id;
  containerTabOpenerService.openNewTabInContainer(cookieStoreId, true).catch((e) => {
    console.error(e);
  });
});
