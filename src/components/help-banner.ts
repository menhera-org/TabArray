/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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

import browser from "webextension-polyfill";

import { ExtensionPageService } from "../lib/ExtensionPageService";
import { DateFormatService } from "../lib/DateFormatService";
import { CompatConsole } from "../lib/console/CompatConsole";
import { ExtensionVersion } from "../lib/ExtensionVersion";
import { PackageInformationService } from "../lib/package/PackageInformationService";

import { CtgMenuItemElement } from "./ctg/ctg-menu-item";

import { GITHUB_TREE_LINK_BASE } from "../defs";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const extensionPageService = ExtensionPageService.getInstance();
const dateFormatService = DateFormatService.getInstance();
const packageInformationService = PackageInformationService.getInstance<PackageInformationService>();

export class HelpBannerElement extends HTMLElement {

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/help-banner.css';
    this.shadowRoot.appendChild(styleSheet);

    const manifest = browser.runtime.getManifest();

    const helpBanner = document.createElement('div');
    helpBanner.classList.add('help-banner');
    this.shadowRoot.appendChild(helpBanner);

    const helpBannerImage = document.createElement('img');
    helpBannerImage.src = '/icon.svg';
    helpBannerImage.classList.add('help-banner-image');
    helpBanner.appendChild(helpBannerImage);

    const helpBannerHeading = document.createElement('h2');
    helpBannerHeading.classList.add('help-banner-heading');
    helpBannerHeading.textContent = manifest.name;
    helpBanner.appendChild(helpBannerHeading);

    const helpBannerVersion = document.createElement('p');
    helpBannerVersion.classList.add('help-banner-version');
    const version = manifest.version;
    const versionObj = ExtensionVersion.fromString(version);
    const patchVersion = versionObj.versionParts[3] ?? 0;
    const isDevelopmentVersion = patchVersion < 200;
    helpBannerVersion.textContent = version + (isDevelopmentVersion ? ' ' + browser.i18n.getMessage('extensionDevBuild') : '');
    helpBanner.appendChild(helpBannerVersion);

    const helpBannerBuild = document.createElement('p');
    helpBanner.appendChild(helpBannerBuild);

    const helpBannerPlatformVersion = document.createElement('p');
    helpBannerPlatformVersion.textContent = 'Firefox';
    helpBanner.appendChild(helpBannerPlatformVersion);

    const helpBannerIntegrity = document.createElement('div');
    helpBannerIntegrity.id = 'help-banner-integrity';
    helpBanner.appendChild(helpBannerIntegrity);

    const helpBannerIntegrityStatus = document.createElement('div');
    helpBannerIntegrityStatus.id = 'help-banner-integrity-status';
    helpBannerIntegrityStatus.textContent = browser.i18n.getMessage('packageIntegrity');
    helpBannerIntegrity.appendChild(helpBannerIntegrityStatus);

    const helpBannerIntegrityHash = document.createElement('input');
    helpBannerIntegrityHash.id = 'help-banner-integrity-hash';
    helpBannerIntegrityHash.type = 'text';
    helpBannerIntegrityHash.readOnly = true;
    helpBannerIntegrityHash.value = '(unknown hash)'; // untranslated
    helpBannerIntegrity.appendChild(helpBannerIntegrityHash);

    Promise.all([
      browser.runtime.getBrowserInfo(),
      browser.runtime.getPlatformInfo(),
    ]).then(([browserInfo, platformInfo]) => {
      helpBannerPlatformVersion.textContent = `${browserInfo.name} ${browserInfo.version} (${platformInfo.os})`;
    }).catch((e) => {
      console.error(e);
    });

    packageInformationService.getPackageInformation().then((info) => {
      const {recordedHash, computedHash: hash, isOfficial, buildInfo, isSigned: signed} = info;
      helpBannerIntegrityHash.value = hash;
      if (recordedHash != hash) {
        helpBannerIntegrityStatus.textContent = browser.i18n.getMessage('packageIntegrityMismatch');
      } else {
        if (isOfficial) {
          helpBannerVersion.classList.add('official');
        }
      }
      {
        helpBannerBuild.textContent = browser.i18n.getMessage('extensionBuild');
        const info = buildInfo;
        helpBannerBuild.append(' ');
        if (info.commit) {
          const commit = String(info.commit);
          const link = GITHUB_TREE_LINK_BASE + commit;
          const shortCommit = commit.slice(0, 7);
          const commitLink = document.createElement('a');
          commitLink.href = link;
          commitLink.textContent = shortCommit;
          commitLink.target = '_blank';
          helpBannerBuild.appendChild(commitLink);
        } else {
          helpBannerBuild.append(browser.i18n.getMessage('extensionBuildUnknown'));
        }
        if (info.untracked) {
          helpBannerBuild.append(' ' + browser.i18n.getMessage('extensionUntracked'));
        }
        if (signed) {
          helpBannerBuild.append(' ' + browser.i18n.getMessage('extensionSigned'));
        } else {
          helpBannerBuild.append(' ' + browser.i18n.getMessage('extensionUnsigned'));
        }
        helpBannerBuild.appendChild(document.createElement('br'));
        const date = new Date(info.buildDate);
        const dateString = dateFormatService.localeFormat(date);
        helpBannerBuild.append(`(${dateString})`);
      }
    }).catch((e) => {
      console.error(e);
      const message = String(e.message ?? e);
      helpBannerBuild.textContent = message;
    });

    const helpBannerDescription = document.createElement('p');
    helpBannerDescription.textContent = manifest.description ?? '';
    helpBanner.appendChild(helpBannerDescription);

    const helpBannerParagraph1 = document.createElement('p');
    helpBanner.appendChild(helpBannerParagraph1);

    const helpBannerAmoLink = document.createElement('a');
    helpBannerAmoLink.href = '#';
    helpBannerAmoLink.textContent = browser.i18n.getMessage('buttonAboutAddon');
    helpBannerParagraph1.appendChild(helpBannerAmoLink);

    helpBannerAmoLink.addEventListener('click', (ev) => {
      ev.preventDefault();
      extensionPageService.openInBackground(ExtensionPageService.AMO);
    });

    const helpBannerParagraph2 = document.createElement('p');
    helpBanner.appendChild(helpBannerParagraph2);

    const helpBannerPrivacyPolicyLink = document.createElement('a');
    helpBannerPrivacyPolicyLink.href = '#';
    helpBannerPrivacyPolicyLink.textContent = browser.i18n.getMessage('privacyPolicy');
    helpBannerParagraph2.appendChild(helpBannerPrivacyPolicyLink);

    helpBannerPrivacyPolicyLink.addEventListener('click', (ev) => {
      ev.preventDefault();
      extensionPageService.openInBackground(ExtensionPageService.PRIVACY_POLICY);
    });

    const helpBannerParagraph3 = document.createElement('p');
    helpBanner.appendChild(helpBannerParagraph3);

    const helpBannerSourceCodeLink = document.createElement('a');
    helpBannerSourceCodeLink.href = '#';
    helpBannerSourceCodeLink.textContent = browser.i18n.getMessage('github');
    helpBannerParagraph3.appendChild(helpBannerSourceCodeLink);

    helpBannerSourceCodeLink.addEventListener('click', (ev) => {
      ev.preventDefault();
      extensionPageService.openInBackground(ExtensionPageService.GITHUB);
    });

    const helpBannerParagraph4 = document.createElement('p');
    helpBannerParagraph4.classList.add('help-banner-actions');
    helpBanner.appendChild(helpBannerParagraph4);

    const reloadButton = new CtgMenuItemElement();
    reloadButton.displayStyle = 'icon';
    reloadButton.iconSrc = '/img/firefox-icons/reload.svg';
    reloadButton.iconMode = 'masked';

    reloadButton.addEventListener('click', () => {
      browser.runtime.reload();
    });

    helpBannerParagraph4.appendChild(reloadButton);
  }
}

customElements.define('help-banner', HelpBannerElement);
