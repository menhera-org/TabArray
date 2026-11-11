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

import { ConsoleEntry, ConsoleHistoryService } from '../../../lib/console/ConsoleHistoryService';

import { ScreenTopBar } from '../../../frontend/frame/TopBar';

import { DebuggingScreenProps, useLoaded, useStickToBottom } from './common';

/** The console output of every part of the extension, oldest first. */
export const LogTable = ({ entries }: { entries: ConsoleEntry[] }) => (
  <table id="logs-table">
    <thead>
      <tr>
        <th>Time</th>
        <th>Context</th>
        <th>Component</th>
        <th>Level</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody id="logs-tbody">
      {entries.map((entry, i) => (
        <tr key={i} data-log-level={entry.outputType}>
          <td>{new Date(entry.unixTime).toISOString()}</td>
          <td>{entry.context}</td>
          <td>{entry.tag}</td>
          <td>{entry.outputType}</td>
          <td>{entry.message}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const LogsScreen = ({ active }: DebuggingScreenProps) => {
  const service = ConsoleHistoryService.getInstance<ConsoleHistoryService>();
  const stick = useStickToBottom(active);
  const entries = useLoaded(() => service.getEntries(), service.onChanged, stick.measure);
  useLayoutEffect(() => stick.afterUpdate(), [entries]);
  return (
    <>
      <ScreenTopBar active={active} heading="Logs" />
      <LogTable entries={entries ?? []} />
    </>
  );
};
