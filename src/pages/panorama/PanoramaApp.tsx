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
import { type ComponentProps, useEffect, useState } from 'react';
import { DisplayedContainer } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';
import { PromiseUtils, ViewRefreshHandler } from 'weeg-utils';

import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';
import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';
import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';
import { TemporaryContainerService } from '../../lib/tabGroups/TemporaryContainerService';
import { TabQueryService } from '../../lib/tabs/TabQueryService';
import { TabService } from '../../lib/tabs/TabService';
import { CompatConsole } from '../../lib/console/CompatConsole';
import { PerformanceHistoryService } from '../../lib/history/PerformanceHistoryService';
import { IndexTab } from '../../lib/tabs/IndexTab';

import { cssUrl } from '../../frontend/cssUrl';
import { showDialog } from '../../frontend/dialogs/showDialog';
import { ConfirmDialog, InfoDialog } from '../../frontend/dialogs/dialogs';
import { ContainerEditorDialog } from '../../frontend/dialogs/ContainerEditorDialog';
import { HelpBanner } from '../../frontend/frame/HelpBanner';

import { PanoramaStateStore } from './PanoramaStateStore';
import { PanoramaTab, PanoramaTabInfo } from './PanoramaTab';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const logError = (e: unknown) => console.error(e);
const message = (name: string, substitution?: string) => browser.i18n.getMessage(name, substitution);

const panoramaStateStore = new PanoramaStateStore();
const contextualIdentityFactory = ContextualIdentityService.getInstance().getFactory();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();

export type PanoramaContainer = {
  container: DisplayedContainer;
  tabs: CompatTab[];
};

export type PanoramaState = { windowId: number; containers: PanoramaContainer[] };

/** Containers with tabs first, each group in the user's order. */
export const sortByTabs = (containers: PanoramaContainer[]) => [
  ...containers.filter((c) => c.tabs.length > 0),
  ...containers.filter((c) => c.tabs.length == 0),
];

/** The containers of the current window's kind (private or not), with their tabs other than index tabs. */
const loadState = async (): Promise<PanoramaState> => {
  const startTime = Date.now();
  const [snapshot, browserWindow] = await Promise.all([
    TabGroupDirectory.getInstance().getSnapshot(),
    browser.windows.get(browser.windows.WINDOW_ID_CURRENT),
  ]);
  const displayedContainers = await DisplayedContainerService.getInstance().getDisplayedContainersByPrivateBrowsing(
    browserWindow.incognito
  );
  snapshot.sortDisplayedContainers(displayedContainers);
  if (browserWindow.id == null) {
    throw new Error('browserWindow.id is null');
  }
  const containers = await Promise.all(
    displayedContainers.map(async (container) => ({
      container,
      tabs: (await TabQueryService.getInstance().queryTabs({ tabGroupId: container.cookieStore.id })).filter(
        (tab) => !IndexTab.isIndexTabUrl(tab.url)
      ),
    }))
  );
  const duration = Date.now() - startTime;
  PerformanceHistoryService.getInstance<PerformanceHistoryService>().addEntry('panorama.render', startTime, duration);
  if (duration > 200) {
    console.info(`render(): took ${duration}ms`);
  }
  return { windowId: browserWindow.id, containers: sortByTabs(containers) };
};

/** Scrolls to a container after it changed, repeatedly while the page settles. */
const showContainerSoon = async (cookieStoreId: string, times = 10) => {
  for (let i = 0; i < times; i++) {
    await PromiseUtils.sleep(100);
    location.hash = `#${cookieStoreId}`;
  }
};

// One container editor at a time.
let closeEditor: (() => void) | null = null;
const openEditor = (
  props: Omit<ComponentProps<typeof ContainerEditorDialog>, 'onClose' | 'onCreated' | 'onUpdated'>
) => {
  closeEditor?.();
  closeEditor = showDialog((close) => (
    <ContainerEditorDialog
      {...props}
      onCreated={(id) => {
        close();
        showContainerSoon(id).catch(logError);
      }}
      onUpdated={(id) => {
        close();
        showContainerSoon(id).catch(logError);
      }}
      onClose={close}
    />
  ));
};

const toTabInfo = (tab: CompatTab): PanoramaTabInfo => ({
  id: tab.id,
  url: tab.url,
  title: tab.title,
  favIconUrl: tab.favIconUrl,
  previewUrl: panoramaStateStore.getPreviewUrl(tab.id),
});

const ContainerSection = ({
  entry: { container, tabs },
  windowId,
  rerender,
}: {
  entry: PanoramaContainer;
  windowId: number;
  rerender: () => void;
}) => {
  const cookieStoreId = container.cookieStore.id;
  const isDefault = container.cookieStore.userContextId == 0;
  return (
    <div
      id={cookieStoreId}
      onDragOver={(ev) => ev.preventDefault()}
      onDrop={(ev) => {
        ev.preventDefault();
        try {
          const data = JSON.parse(ev.dataTransfer.getData('application/json') || '');
          if (!data.id) return;
          console.log('drop', data.id, cookieStoreId);
          containerTabOpenerService
            .reopenTabInContainer(data.id, cookieStoreId, false)
            .then(() => showContainerSoon(cookieStoreId, 20))
            .catch(logError);
        } catch {
          // ignore
        }
      }}
    >
      <div className="container-heading" data-tab-count={tabs.length}>
        <div
          className="container-icon"
          style={{
            mask: `${cssUrl(container.iconUrl || '/img/firefox-icons/tab.svg')} center center/75% no-repeat`,
            backgroundColor: container.colorCode || '#000000',
          }}
        />
        <a className="container-label" href={`#${cookieStoreId}`}>
          {container.name}
        </a>
        <button
          className="ctg-icon-button container-edit"
          disabled={isDefault}
          title={message('buttonEditContainer')}
          onClick={() => {
            contextualIdentityFactory
              .get(cookieStoreId)
              .then((contextualIdentity) => openEditor({ contextualIdentity }))
              .catch(logError);
          }}
        />
        <button
          className="ctg-icon-button container-delete"
          disabled={isDefault}
          title={message('buttonDeleteContainer')}
          onClick={() => {
            contextualIdentityFactory
              .get(cookieStoreId)
              .then((contextualIdentity) => {
                if (!contextualIdentity) return;
                showDialog((close) => (
                  <ConfirmDialog
                    title={message('confirmContainerDelete', contextualIdentity.name)}
                    onCancel={close}
                    onOk={() => {
                      close();
                      contextualIdentityFactory.remove(cookieStoreId).catch(logError);
                    }}
                  />
                ));
              })
              .catch(logError);
          }}
        />
        <button
          className="ctg-icon-button container-close"
          title={message('tooltipContainerCloseAll')}
          onClick={() => {
            TabQueryService.getInstance()
              .queryTabs({ tabGroupId: cookieStoreId })
              .then((all) => TabService.getInstance().closeTabs(all))
              .catch(logError);
          }}
        />
      </div>
      <div className="container-tabs">
        <button
          className="container-new-tab"
          onClick={() => {
            containerTabOpenerService
              .openNewTabInContainer(cookieStoreId, true, windowId)
              .then(() => window.close())
              .catch(logError);
          }}
        >
          {message('buttonOpenTabInContainer')}
        </button>
        {tabs.map((tab) => (
          <PanoramaTab
            key={tab.id}
            tab={toTabInfo(tab)}
            onActivate={() => {
              tab
                .focus()
                .then(() => window.close())
                .catch(logError);
            }}
            onClose={() => {
              browser.tabs.remove(tab.id).then(rerender, logError);
            }}
            onContextMenu={() => {
              browser.menus.overrideContext({ context: 'tab', tabId: tab.id });
            }}
          />
        ))}
      </div>
    </div>
  );
};

const BottomBar = () => (
  <div id="topbar">
    {/* actually, this should be called bottombar */}
    <button
      id="button-new-container"
      className="ctg-icon-button"
      title={message('buttonNewContainer')}
      onClick={() => openEditor({})}
    >
      <span className="button-text">buttonNewContainer</span>
    </button>{' '}
    <button
      id="button-new-temporary-container"
      className="ctg-icon-button"
      title={message('buttonNewTemporaryContainer')}
      onClick={() => {
        TemporaryContainerService.getInstance()
          .createTemporaryContainer()
          .then(() => window.close())
          .catch(logError);
      }}
    >
      <span className="button-text">buttonNewTemporaryContainer</span>
    </button>{' '}
    <button
      id="button-settings"
      className="ctg-icon-button"
      title={message('buttonSettings')}
      onClick={() => {
        browser.runtime.openOptionsPage().then(() => window.close(), logError);
      }}
    >
      <span className="button-text">buttonSettings</span>
    </button>{' '}
    <button
      id="button-help"
      className="ctg-icon-button"
      title={message('menuItemHelp')}
      onClick={() =>
        showDialog((close) => (
          <InfoDialog onClose={close}>
            <HelpBanner />
          </InfoDialog>
        ))
      }
    >
      <span className="button-text">menuItemHelp</span>
    </button>
  </div>
);

/** Panorama: every container of this kind of window with its tabs as cards, and a bar of actions. */
export const PanoramaApp = () => {
  const [state, setState] = useState<PanoramaState | null>(null);
  const [handler] = useState(() => new ViewRefreshHandler(async () => setState(await loadState())));
  useEffect(() => {
    const render = () => {
      handler.render().catch(logError);
    };
    render();
    contextualIdentityFactory.onCreated.addListener(render);
    contextualIdentityFactory.onRemoved.addListener(render);
    contextualIdentityFactory.onUpdated.addListener(render);
    browser.tabs.onRemoved.addListener(render);
    browser.tabs.onUpdated.addListener(render, { properties: ['favIconUrl', 'title', 'url'] });
    browser.tabs.onCreated.addListener(render);
    browser.tabs
      .query({})
      .then((tabs) => panoramaStateStore.updatePreviewUrls(tabs.map((tab) => new CompatTab(tab).id)))
      .then(render, logError);
  }, [handler]);
  const rerender = () => {
    handler.render().catch(logError);
  };
  return (
    <>
      <div id="containers">
        {state?.containers.map((entry) => (
          <ContainerSection
            key={entry.container.cookieStore.id}
            entry={entry}
            windowId={state.windowId}
            rerender={rerender}
          />
        ))}
      </div>
      <BottomBar />
    </>
  );
};
