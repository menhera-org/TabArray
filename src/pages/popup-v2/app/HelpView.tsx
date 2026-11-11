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

import '../../../components/help-banner';

import styles from './HelpView.module.css';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'help-banner': object;
    }
  }
}

export type HelpSettings = {
  firstPartyIsolate: boolean;
  languageOverrides: boolean;
  uaOverrides: boolean;
  perContainerProxy: boolean;
};

type HelpViewProps = {
  settings: HelpSettings;
  onChange: (name: keyof HelpSettings, checked: boolean) => void;
  onGetStarted: () => void;
};

const Checkbox = ({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <p className="browser-style">
    <input type="checkbox" id={id} checked={checked} onChange={(ev) => onChange(ev.currentTarget.checked)} />
    <label htmlFor={id} className="browser-style-label">
      {browser.i18n.getMessage(label)}
    </label>
  </p>
);

/** The help drawer's content: the banner, a few settings and "get started". */
export const HelpView = ({ settings, onChange, onGetStarted }: HelpViewProps) => (
  <div className={styles.help}>
    <help-banner />
    <hr />
    <div>
      <p>{browser.i18n.getMessage('fpiDescription')}</p>
      <Checkbox
        id="input-firstPartyIsolate"
        label="labelFirstPartyIsolate"
        checked={settings.firstPartyIsolate}
        onChange={(checked) => onChange('firstPartyIsolate', checked)}
      />
      <p>{browser.i18n.getMessage('optionalFeaturesDescription')}</p>
      <Checkbox
        id="input-featureLanguageOverrides"
        label="featureLanguageOverrides"
        checked={settings.languageOverrides}
        onChange={(checked) => onChange('languageOverrides', checked)}
      />
      <Checkbox
        id="input-featureUaOverrides"
        label="featureUaOverrides"
        checked={settings.uaOverrides}
        onChange={(checked) => onChange('uaOverrides', checked)}
      />
      <Checkbox
        id="input-featurePerContainerProxy"
        label="featurePerContainerProxy"
        checked={settings.perContainerProxy}
        onChange={(checked) => onChange('perContainerProxy', checked)}
      />
    </div>
    <div className={styles.actions}>
      <button className={styles.getStarted} onClick={onGetStarted}>
        {browser.i18n.getMessage('buttonGetStarted')}
      </button>
    </div>
  </div>
);
