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
import { type ReactNode, useEffect, useState } from 'react';
import { PromiseUtils } from 'weeg-utils';

import { ExtensionPage, ExtensionPageService } from '../../lib/ExtensionPageService';
import { DateFormatService } from '../../lib/DateFormatService';
import { CompatConsole } from '../../lib/console/CompatConsole';
import { ExtensionVersion } from '../../lib/ExtensionVersion';
import { PackageInformationService } from '../../lib/package/PackageInformationService';
import { PackageInformation } from '../../lib/package/PackageInformation';

import { GITHUB_TREE_LINK_BASE } from '../../defs';

import { MenuItem } from './MenuItem';

import styles from './HelpBanner.module.css';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const message = (name: string) => browser.i18n.getMessage(name);

/** The version, marked as a development build below x.y.z.200. */
export const versionText = (version: string) => {
  const patch = ExtensionVersion.fromString(version).versionParts[3] ?? 0;
  return version + (patch < 200 ? ' ' + message('extensionDevBuild') : '');
};

/** The build line: commit (linked), whether untracked and signed, and the build date. */
export const BuildInfo = ({ info }: { info: PackageInformation }) => {
  const { buildInfo, isSigned } = info;
  const commit = buildInfo.commit ? String(buildInfo.commit) : null;
  return (
    <>
      {message('extensionBuild')}{' '}
      {commit ? (
        <a href={GITHUB_TREE_LINK_BASE + commit} target="_blank">
          {commit.slice(0, 7)}
        </a>
      ) : (
        message('extensionBuildUnknown')
      )}
      {buildInfo.untracked ? ' ' + message('extensionUntracked') : ''}
      {' ' + message(isSigned ? 'extensionSigned' : 'extensionUnsigned')}
      <br />
      {`(${DateFormatService.getInstance().localeFormat(new Date(buildInfo.buildDate))})`}
    </>
  );
};

const PageLink = ({ page, label }: { page: ExtensionPage; label: string }) => (
  <p>
    <a
      href="#"
      onClick={(ev) => {
        ev.preventDefault();
        ExtensionPageService.getInstance().openInBackground(page);
      }}
    >
      {message(label)}
    </a>
  </p>
);

/** The extension's name, version, build, package integrity and links. */
export const HelpBanner = () => {
  const manifest = browser.runtime.getManifest();
  const [platform, setPlatform] = useState('Firefox');
  const [info, setInfo] = useState<PackageInformation | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([browser.runtime.getBrowserInfo(), browser.runtime.getPlatformInfo()])
      .then(([browserInfo, platformInfo]) => {
        setPlatform(`${browserInfo.name} ${browserInfo.version} (${platformInfo.os})`);
      })
      .catch((e) => console.error(e));
    PromiseUtils.sleep(500)
      .then(() => PackageInformationService.getInstance<PackageInformationService>().getPackageInformation())
      .then(setInfo)
      .catch((e) => {
        console.error(e);
        setBuildError(String(e.message ?? e));
      });
  }, []);
  const intact = info == null || info.recordedHash == info.computedHash;
  let build: ReactNode = null;
  if (buildError != null) build = buildError;
  else if (info) build = <BuildInfo info={info} />;
  return (
    <div className={styles.banner}>
      <img src="/icon.svg" className={styles.image} />
      <h2>{manifest.name}</h2>
      <p className={`${styles.version} ${info && intact && info.isOfficial ? styles.official : ''}`}>
        {versionText(manifest.version)}
      </p>
      <p>{build}</p>
      <p>{platform}</p>
      <div className={styles.integrity}>
        <div>{message(intact ? 'packageIntegrity' : 'packageIntegrityMismatch')}</div>
        <input type="text" className={styles.hash} readOnly value={info?.computedHash ?? '(unknown hash)'} />
      </div>
      <p>{manifest.description ?? ''}</p>
      <PageLink page={ExtensionPageService.AMO} label="buttonAboutAddon" />
      <PageLink page={ExtensionPageService.PRIVACY_POLICY} label="privacyPolicy" />
      <PageLink page={ExtensionPageService.GITHUB} label="github" />
      <p className={styles.actions}>
        <MenuItem iconOnly icon="/img/firefox-icons/reload.svg" onClick={() => browser.runtime.reload()} />
      </p>
    </div>
  );
};
