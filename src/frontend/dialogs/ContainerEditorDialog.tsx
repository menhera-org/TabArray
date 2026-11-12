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
import { ContextualIdentity, CookieStore, DisplayedContainer } from 'weeg-containers';

import { SupergroupService } from '../../lib/tabGroups/SupergroupService';
import { ContainerCreatorService } from '../../lib/tabGroups/ContainerCreatorService';
import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';
import { CookieCopyService } from '../../lib/cookies/CookieCopyService';
import { CompatConsole } from '../../lib/console/CompatConsole';

import { ModalFrame } from './ModalFrame';
import { NameField } from './NameField';
import { cleanName } from './dialogs';

import styles from './ContainerEditorDialog.module.css';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export const ICONS = [
  'fingerprint',
  'briefcase',
  'dollar',
  'cart',
  'circle',
  'gift',
  'vacation',
  'food',
  'fruit',
  'pet',
  'tree',
  'chill',
  'fence',
];

/** The colors offered: the pre-153 names, which every supported Firefox accepts, and violet where supported. */
export const getColors = (violetSupported = ContextualIdentityService.VIOLET_SUPPORTED) => {
  const colors = ['blue', 'turquoise', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'toolbar'];
  if (violetSupported) colors.push('violet');
  return colors;
};

/** The offered color for a container's color (Firefox 153+ reports gray and cyan, #646), or the first one. */
export const pickerColor = (color: string, colors = getColors()) => {
  const supported = ContextualIdentityService.toSupportedColor(color);
  return colors.includes(supported) ? supported : (colors[0] as string);
};

type PickerProps = {
  name: 'icon' | 'color';
  choices: string[];
  value: string;
  onChange: (value: string) => void;
  /** The data-identity-color and data-identity-icon of a choice's swatch. */
  swatch: (choice: string) => [color: string, icon: string];
};

const Picker = ({ name, choices, value, onChange, swatch }: PickerProps) => (
  <form className={styles.radios}>
    {choices.map((choice) => {
      const [color, icon] = swatch(choice);
      return [
        <input
          key={`${choice}-input`}
          type="radio"
          name={name}
          id={`${name}-${choice}`}
          value={choice}
          checked={choice == value}
          onChange={() => onChange(choice)}
        />,
        <label
          key={`${choice}-label`}
          htmlFor={`${name}-${choice}`}
          className={styles.swatch}
          data-identity-color={color}
          data-identity-icon={icon}
        />,
      ];
    })}
  </form>
);

type ContainerEditorDialogProps = {
  /** The container to edit; without one, a new container is created. */
  contextualIdentity?: ContextualIdentity;
  /** The group a new container goes into. */
  parentTabGroupId?: string;
  onCreated?: (cookieStoreId: string) => void;
  onUpdated?: (cookieStoreId: string) => void;
  /** The Cancel button, before onClose. */
  onCancel?: () => void;
  onClose: () => void;
};

/** Creates or edits a container: name, icon, color, and for a new one, cookies to copy from another container. */
export const ContainerEditorDialog = ({
  contextualIdentity,
  parentTabGroupId,
  onCreated,
  onUpdated,
  onCancel,
  onClose,
}: ContainerEditorDialogProps) => {
  const colors = getColors();
  const [name, setName] = useState(contextualIdentity?.name ?? '');
  const [icon, setIcon] = useState(contextualIdentity?.icon ?? (ICONS[0] as string));
  const [color, setColor] = useState(contextualIdentity ? pickerColor(contextualIdentity.color, colors) : colors[0]);
  const [copyCookies, setCopyCookies] = useState(false);
  const [copySource, setCopySource] = useState(CookieStore.DEFAULT.id);
  const [containers, setContainers] = useState<DisplayedContainer[]>([]);
  useEffect(() => {
    DisplayedContainerService.getInstance()
      .getDisplayedContainers()
      .then(setContainers)
      .catch((e) => console.error(e));
  }, []);

  const created = (cookieStoreId: string) => {
    if (!copyCookies) {
      onCreated?.(cookieStoreId);
      return;
    }
    CookieCopyService.getInstance()
      .copyAllCookiesToContainer(copySource, cookieStoreId)
      .then(() => onCreated?.(cookieStoreId))
      .catch((e) => console.error(e));
  };
  const save = async () => {
    const cleaned = cleanName(name);
    if (cleaned == '') return;
    const creator = ContainerCreatorService.getInstance<ContainerCreatorService>();
    if (contextualIdentity) {
      onUpdated?.(await creator.update(contextualIdentity.cookieStore.id, cleaned, color as string, icon));
    } else if (parentTabGroupId) {
      const identity = await SupergroupService.getInstance().createChildContainer(parentTabGroupId, {
        name: cleaned,
        icon,
        color: color as string,
      });
      created(identity.cookieStore.id);
    } else {
      created((await creator.create(cleaned, color as string, icon)) as string);
    }
    onClose();
  };

  const message = (key: string) => browser.i18n.getMessage(key);
  return (
    <ModalFrame
      title={message(contextualIdentity ? 'editContainerDialogTitle' : 'newContainerDialogTitle')}
      actions={[
        {
          label: message('buttonCancel'),
          onClick: () => {
            onCancel?.();
            onClose();
          },
        },
        { label: message('buttonOk'), isDefault: true, onClick: () => save().catch((e) => console.error(e)) },
      ]}
    >
      <NameField value={name} onChange={setName} />
      <Picker name="icon" choices={ICONS} value={icon} onChange={setIcon} swatch={(choice) => ['grey', choice]} />
      <Picker
        name="color"
        choices={colors}
        value={color as string}
        onChange={setColor}
        swatch={(choice) => [choice == 'toolbar' ? 'grey' : choice, 'circle']}
      />
      <p hidden={contextualIdentity != null}>
        <input
          type="checkbox"
          id="cookie-copy-checkbox"
          checked={copyCookies}
          onChange={(ev) => setCopyCookies(ev.currentTarget.checked)}
        />
        <label htmlFor="cookie-copy-checkbox">{message('copyCookiesFrom')}</label>
        <select disabled={!copyCookies} value={copySource} onChange={(ev) => setCopySource(ev.currentTarget.value)}>
          {containers.map((container) => (
            <option key={container.cookieStore.id} value={container.cookieStore.id}>
              {container.name}
            </option>
          ))}
        </select>
      </p>
    </ModalFrame>
  );
};
