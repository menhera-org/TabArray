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

import { TabIconService } from '../../../lib/TabIconService';

import styles from './TabFavicon.module.css';

import { cssUrl } from '../../../frontend/cssUrl';

export { cssUrl };

/**
 * A tab's favicon. Firefox's own chrome:// icons (and a missing icon) are drawn as
 * a mask in the text color, because extension pages cannot load chrome:// images.
 */
export const TabFavicon = ({ url, className = '' }: { url: string; className?: string }) => {
  const tabIconService = TabIconService.getInstance();
  if (tabIconService.isMaskedIcon(url)) {
    return (
      <span
        className={`${styles.icon} ${styles.masked} ${className}`}
        style={{ maskImage: cssUrl(tabIconService.getMaskedIcon(url)) }}
      />
    );
  }
  return <span className={`${styles.icon} ${className}`} style={{ backgroundImage: cssUrl(url) }} />;
};
