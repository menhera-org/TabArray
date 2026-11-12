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

import { useLayoutEffect } from 'react';

import { ConsoleHistoryService } from '../../../lib/console/ConsoleHistoryService';
import { InstallationHistoryService, InstallationInfo } from '../../../lib/history/InstallationHistoryService';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';

import { DebuggingScreenProps, useLoaded, useStickToBottom } from './common';

/** "abcdef1 (untracked) (signed)": the short commit and how the build was made. */
export const describeCommit = (info: InstallationInfo): string =>
  `${info.commit.slice(0, 7)}${info.untracked ? ' (untracked)' : ''}${info.signed ? ' (signed)' : ' (unsigned)'}`;

/** Each installation or update, with the package integrity flagged in red when it changed since. */
export const InstallationTable = ({ entries }: { entries: InstallationInfo[] }) => (
  <table id="installation-table">
    <thead>
      <tr>
        <th>Time</th>
        <th>Commit</th>
        <th>Build date</th>
        <th>Integrity</th>
        <th>Browser</th>
      </tr>
    </thead>
    <tbody id="installation-tbody">
      {entries.map((entry, i) => (
        <tr key={i}>
          <td>{entry.installationDate}</td>
          <td>{describeCommit(entry)}</td>
          <td>{entry.buildDate}</td>
          <td style={entry.computedIntegrity != entry.recordedIntegrity ? { color: 'red' } : undefined}>
            {entry.computedIntegrity}
          </td>
          <td>{`${entry.browserName} ${entry.browserVersion} (${entry.browserPlatformOs})`}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const InstallationHistoryScreen = ({ active }: DebuggingScreenProps) => {
  const stick = useStickToBottom(active);
  const entries = useLoaded(
    () => InstallationHistoryService.getInstance().getValue(),
    // This reloads with the console log, not with the installation history.
    ConsoleHistoryService.getInstance<ConsoleHistoryService>().onChanged,
    stick.measure
  );
  useLayoutEffect(() => stick.afterUpdate(), [entries]);
  return (
    <>
      <ScreenTopBar active={active} heading="Installation History" />
      <InstallationTable entries={entries ?? []} />
    </>
  );
};
