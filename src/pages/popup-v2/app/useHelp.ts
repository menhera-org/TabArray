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

import { useEffect, useState } from 'react';

import { FpiService } from '../../../lib/config/FpiService';
import { CompatConsole } from '../../../lib/console/CompatConsole';
import { config, privacyConfig } from '../../../config/config';

import { HelpSettings } from './HelpView';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const logError = (e: unknown) => console.error(e);

const FEATURES = {
  languageOverrides: config['feature.languageOverrides'],
  uaOverrides: config['feature.uaOverrides'],
  perContainerProxy: config['feature.containerProxy'],
} as const;

const setFirstPartyIsolate = (value: boolean) => {
  FpiService.getInstance().setFirstPartyIsolate(value).catch(logError);
};

/**
 * The help drawer's state. It opens by itself until the user has seen it once (first run).
 * Firefox settings change only when the user asks: a checkbox, or "apply recommended settings".
 */
export const useHelp = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<HelpSettings>({
    firstPartyIsolate: false,
    languageOverrides: false,
    uaOverrides: false,
    perContainerProxy: false,
  });
  const set = (name: keyof HelpSettings, value: boolean) => setSettings((s) => ({ ...s, [name]: value }));

  useEffect(() => {
    config['help.shownOnce']
      .getValue()
      .then((shownOnce) => {
        if (!shownOnce) setOpen(true);
      })
      .catch(logError);
    privacyConfig.firstPartyIsolate.observe((value) => set('firstPartyIsolate', value));
    for (const [name, option] of Object.entries(FEATURES)) {
      option.observe((value) => set(name as keyof typeof FEATURES, value));
    }
  }, []);

  return {
    open,
    settings,
    show: () => setOpen(true),
    hide: () => {
      setOpen(false);
      config['help.shownOnce'].setValue(true, 'local').catch(logError);
    },
    /** The recommended Firefox settings: first-party isolation on. */
    applyRecommended: () => {
      set('firstPartyIsolate', true);
      setFirstPartyIsolate(true);
    },
    change: (name: keyof HelpSettings, checked: boolean) => {
      set(name, checked);
      if (name == 'firstPartyIsolate') {
        setFirstPartyIsolate(checked);
      } else {
        FEATURES[name].setValue(checked).catch(logError);
      }
    },
  };
};
