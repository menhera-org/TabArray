/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
 Copyright (C) 2024 Menhera.org

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

export type ContainerColor =
  'blue'
  | 'turquoise'
  | 'green'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'red'
  | 'yellow'
  | 'toolbar';

export type NativeTabGroupColor =
  'blue'
  | 'cyan'
  | 'green'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'red'
  | 'yellow'
  | 'grey';

const containerToNative: Record<ContainerColor, NativeTabGroupColor> = {
  blue: 'blue',
  turquoise: 'cyan',
  green: 'green',
  orange: 'orange',
  pink: 'pink',
  purple: 'purple',
  red: 'red',
  yellow: 'yellow',
  toolbar: 'grey',
};

const nativeToContainer: Record<NativeTabGroupColor, ContainerColor> = {
  blue: 'blue',
  cyan: 'turquoise',
  green: 'green',
  orange: 'orange',
  pink: 'pink',
  purple: 'purple',
  red: 'red',
  yellow: 'yellow',
  grey: 'toolbar',
};

export function mapContainerColorToNative(color: string | undefined): NativeTabGroupColor | undefined {
  if (!color) {
    return undefined;
  }
  return containerToNative[color as ContainerColor];
}

export function mapNativeColorToContainer(color: string | undefined): ContainerColor | undefined {
  if (!color) {
    return undefined;
  }
  return nativeToContainer[color as NativeTabGroupColor];
}
