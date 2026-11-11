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
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { CookieStore } from 'weeg-containers';

import { BrowserStateDao } from '../../../lib/states/BrowserStateDao';
import { SpinnerService } from '../../../lib/SpinnerService';
import { CompatConsole } from '../../../lib/console/CompatConsole';

import { PopupCommandHandler, SCREEN_COMMANDS } from '../PopupCommandHandler';

import { WindowsScreen } from '../screens/WindowsScreen';
import { ContainersScreen } from '../screens/ContainersScreen';
import { SitesScreen } from '../screens/SitesScreen';
import { ContainerDetailsScreen } from '../screens/ContainerDetailsScreen';
import { SiteDetailsScreen } from '../screens/SiteDetailsScreen';

import { TopBar } from './TopBar';
import { BottomNavigation, NavigationTarget } from './BottomNavigation';
import { Drawer } from './Drawer';
import { HelpView } from './HelpView';
import { ThrottledState } from './throttledState';
import { useHelp } from './useHelp';

import styles from './App.module.css';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

/** The screens on the bottom navigation, in order. */
export const NAVIGATION_TARGETS: NavigationTarget[] = [
  { id: 'fragment-windows', icon: '/img/firefox-icons/window.svg', label: 'menuItemWindows' },
  { id: 'fragment-containers', icon: '/img/firefox-icons/folder.svg', label: 'menuItemMain' },
  { id: 'fragment-sites', icon: '/img/firefox-icons/defaultFavicon.svg', label: 'menuItemSites' },
];

/** Detail screens, with the screen they belong to and go back to. */
export const PARENT_SCREENS: Record<string, string> = {
  'fragment-container-details': 'fragment-containers',
  'fragment-site-details': 'fragment-sites',
};

/** Kept mounted while hidden, as the old fragments were, so screens keep their state. */
const Screen = ({ id, activeId, children }: { id: string; activeId: string; children: ReactNode }) => (
  <div id={id} className={styles.screen} hidden={id != activeId} data-screen>
    {children}
  </div>
);

const useSpinning = () => {
  const [transactions] = useState(() => new Set<string>());
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
    const spinnerService = SpinnerService.getInstance();
    const begin = (id: string) => {
      transactions.add(id);
      setSpinning(true);
    };
    const end = (id: string) => {
      transactions.delete(id);
      setSpinning(transactions.size > 0);
    };
    spinnerService.onTransactionBegin.addListener(begin);
    spinnerService.onTransactionEnd.addListener(end);
    return () => {
      spinnerService.onTransactionBegin.removeListener(begin);
      spinnerService.onTransactionEnd.removeListener(end);
    };
  }, [transactions]);
  return spinning;
};

/** Keyboard commands switch screens, and their shortcuts show on the bottom navigation. */
const useCommands = (showScreen: (screenId: string) => void) => {
  const [shortcuts, setShortcuts] = useState(new Map<string, string>());
  useEffect(() => {
    const handler = new PopupCommandHandler(showScreen);
    handler.start();
    handler
      .getCommands()
      .then((commands) => {
        const byScreen = new Map<string, string>();
        for (const [screenId, command] of Object.entries(SCREEN_COMMANDS)) {
          byScreen.set(screenId, commands.get(command) ?? '');
        }
        setShortcuts(byScreen);
      })
      .catch((e) => console.error(e));
    return () => handler.stop();
  }, [showScreen]);
  return shortcuts;
};

export type AppProps = {
  state: ThrottledState<BrowserStateDao>;
  isPopup: boolean;
};

export const App = ({ state, isPopup }: AppProps) => {
  const browserState = useSyncExternalStore(state.subscribe, state.getSnapshot);
  const [activeId, setActiveId] = useState('fragment-windows');
  const [cookieStoreId, setCookieStoreId] = useState(CookieStore.DEFAULT.id);
  const [domain, setDomain] = useState('(none)');
  const help = useHelp();
  const spinning = useSpinning();
  const shortcuts = useCommands(setActiveId);

  const parentId = PARENT_SCREENS[activeId];
  const isActive = (id: string) => id == activeId;
  return (
    <>
      <div className={styles.layout}>
        <TopBar
          onBack={parentId ? () => setActiveId(parentId) : null}
          onHelp={help.show}
          spinning={spinning}
          isPopup={isPopup}
        >
          <div className={styles.frame}>
            {browserState && (
              <>
                <Screen id="fragment-windows" activeId={activeId}>
                  <WindowsScreen browserState={browserState} active={isActive('fragment-windows')} />
                </Screen>
                <Screen id="fragment-containers" activeId={activeId}>
                  <ContainersScreen
                    browserState={browserState}
                    active={isActive('fragment-containers')}
                    onContainerClick={(id) => {
                      setCookieStoreId(id);
                      setActiveId('fragment-container-details');
                    }}
                  />
                </Screen>
                <Screen id="fragment-sites" activeId={activeId}>
                  <SitesScreen
                    browserState={browserState}
                    active={isActive('fragment-sites')}
                    onSiteClick={(site) => {
                      setDomain(site);
                      setActiveId('fragment-site-details');
                    }}
                  />
                </Screen>
                <Screen id="fragment-container-details" activeId={activeId}>
                  <ContainerDetailsScreen
                    browserState={browserState}
                    active={isActive('fragment-container-details')}
                    cookieStoreId={cookieStoreId}
                  />
                </Screen>
                <Screen id="fragment-site-details" activeId={activeId}>
                  <SiteDetailsScreen
                    browserState={browserState}
                    active={isActive('fragment-site-details')}
                    domain={domain}
                  />
                </Screen>
              </>
            )}
          </div>
        </TopBar>
        <BottomNavigation
          targets={NAVIGATION_TARGETS}
          selected={parentId ?? activeId}
          tooltips={shortcuts}
          onSelect={setActiveId}
        />
      </div>
      <Drawer open={help.open} heading={browser.i18n.getMessage('menuItemHelp')} onClose={help.hide}>
        <HelpView settings={help.settings} onChange={help.change} onGetStarted={help.hide} />
      </Drawer>
    </>
  );
};
