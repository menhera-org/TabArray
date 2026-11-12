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

// this is not translated.

import { type ComponentType, useRef, useState } from 'react';

import { TopBar } from '../../frontend/frame/TopBar';
import { BottomNavigation, NavigationTarget } from '../../frontend/frame/BottomNavigation';
import { Drawer } from '../../frontend/frame/Drawer';
import { HelpBanner } from '../../frontend/frame/HelpBanner';

import { DebuggingScreenProps, FrameContext } from './views/common';
import { LogsScreen } from './views/LogsView';
import { PerformanceScreen } from './views/PerformanceView';
import { FilesScreen } from './views/FilesView';
import { InstallationHistoryScreen } from './views/InstallationHistoryView';
import { TabCountScreen } from './views/TabCountView';

import styles from './DebuggingApp.module.css';

type DebuggingScreen = NavigationTarget & { Screen: ComponentType<DebuggingScreenProps> };

export const SCREENS: DebuggingScreen[] = [
  { id: 'fragment-log', icon: '/img/firefox-icons/developer.svg', label: 'Logs', Screen: LogsScreen },
  {
    id: 'fragment-performance',
    icon: '/img/firefox-icons/performance.svg',
    label: 'Performance',
    Screen: PerformanceScreen,
  },
  { id: 'fragment-files', icon: '/img/firefox-icons/folder.svg', label: 'Files', Screen: FilesScreen },
  // The id's typo is kept: it is the screen's long-standing name.
  {
    id: 'fragment-hisotry',
    icon: '/img/firefox-icons/extension.svg',
    label: 'History',
    Screen: InstallationHistoryScreen,
  },
  { id: 'fragment-tab-count', icon: '/img/firefox-icons/tab.svg', label: 'Tab Count', Screen: TabCountScreen },
];

/** The debugging page: logs, performance, package files, installations and tab counts. */
export const DebuggingApp = () => {
  const [activeId, setActiveId] = useState('fragment-log');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className={styles.layout}>
        <TopBar
          onBack={null}
          drawerButton={{ icon: '/img/firefox-icons/menu.svg', onClick: () => setDrawerOpen(true) }}
          spinning={false}
          isPopup={false}
        >
          <div className={styles.frame} ref={frame}>
            <FrameContext value={frame}>
              {/* All screens stay mounted, so each keeps loading its data while hidden. */}
              {SCREENS.map(({ id, Screen }) => (
                <div key={id} id={id} hidden={id != activeId}>
                  <Screen active={id == activeId} />
                </div>
              ))}
            </FrameContext>
          </div>
        </TopBar>
        <BottomNavigation targets={SCREENS} selected={activeId} tooltips={new Map()} onSelect={setActiveId} />
      </div>
      <Drawer open={drawerOpen} heading="" onClose={() => setDrawerOpen(false)}>
        <HelpBanner />
      </Drawer>
    </>
  );
};
