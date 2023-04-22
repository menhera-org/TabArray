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

import { TabPreviewService } from "../../lib/tabs/TabPreviewService";

const tabPreviewService = TabPreviewService.getInstance();

/**
 * Panorama page is generally short-lived, so we don't need to worry about
 * non-updated preview images. Memory leaks are not a problem.
 */
export class PanoramaStateStore {
  private readonly previewUrls = new Map<number, string>();

  public getPreviewUrl(tabId: number): string {
    return this.previewUrls.get(tabId) ?? "";
  }

  public async updatePreviewUrl(tabId: number): Promise<void> {
    try {
      // preview images are also cached upstream in TabPreviewService.
      const url = await tabPreviewService.getTabPreview(tabId);
      this.previewUrls.set(tabId, url);
    } catch (e) {
      // ignore.
    }
  }

  public async updatePreviewUrls(tabIds: number[]): Promise<void> {
    const promises = tabIds.map((tabId) => this.updatePreviewUrl(tabId));
    await Promise.all(promises);
  }
}
