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
import { useEffect, useState } from 'react';

import { ConfigurationOption } from '../../lib/config/ConfigurationOption';
import { CompatConsole } from '../../lib/console/CompatConsole';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

/** A setting's current value (null until loaded), kept up to date, and a setter that saves it. */
export const useOption = <T,>(option: ConfigurationOption<T>, save?: (value: T) => Promise<void>) => {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    // Options live as long as the page, and observe() offers no way to stop.
    option.observe((newValue) => setValue(() => newValue));
  }, [option]);
  const change = (newValue: T) => {
    setValue(() => newValue);
    (save ?? ((v: T) => option.setValue(v)))(newValue).catch((e) => console.error(e));
  };
  return [value, change] as const;
};

type CheckboxSettingProps = {
  id: string;
  /** i18n message name. */
  label: string;
  option: ConfigurationOption<boolean>;
  /** Instead of option.setValue(). */
  save?: (value: boolean) => Promise<void>;
};

export const CheckboxSetting = ({ id, label, option, save }: CheckboxSettingProps) => {
  const [checked, setChecked] = useOption(option, save);
  return (
    <p className="ctg-checkbox">
      <input
        type="checkbox"
        id={id}
        checked={checked ?? false}
        onChange={(ev) => setChecked(ev.currentTarget.checked)}
      />{' '}
      <label htmlFor={id}>{browser.i18n.getMessage(label)}</label>
    </p>
  );
};

type SelectSettingProps<T extends string | number> = {
  id: string;
  /** i18n message name. */
  label: string;
  option: ConfigurationOption<T>;
  /** Values with their i18n message names; the first one shows until the setting loads. */
  choices: [T, string][];
};

export const SelectSetting = <T extends string | number>({ id, label, option, choices }: SelectSettingProps<T>) => {
  const [value, setValue] = useOption(option);
  return (
    <p>
      <label htmlFor={id}>{browser.i18n.getMessage(label)}</label>{' '}
      <select
        id={id}
        value={String(value ?? choices[0]?.[0])}
        onChange={(ev) => {
          const choice = choices.find(([v]) => String(v) == ev.currentTarget.value);
          if (choice) setValue(choice[0]);
        }}
      >
        {choices.map(([v, message]) => (
          <option key={v} value={String(v)}>
            {browser.i18n.getMessage(message)}
          </option>
        ))}
      </select>
    </p>
  );
};
