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

export const containersElement = document.querySelector('#containers') as HTMLElement;
export const headingElement = document.querySelector('#heading') as HTMLElement;
export const descriptionElement = document.querySelector('#description') as HTMLElement;
export const promptElement = document.querySelector('#prompt') as HTMLElement;
export const settingsButton = document.querySelector('#button-settings') as HTMLElement;

if (!containersElement || !headingElement || !descriptionElement || !promptElement || !settingsButton) {
  throw new Error('Missing elements');
}
