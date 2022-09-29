// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
*/

import { Xyz } from './Xyz';

export class Srgb {
  public readonly r: number;
  public readonly g: number;
  public readonly b: number;

  private static validateColorValue(value: number): boolean {
    return value >= 0 && value <= 1 && !isNaN(value);
  }

  private static colorValueTo8bit(value: number): number {
    return Math.min(255, Math.floor(value * 256));
  }

  private static xyzToLinearRgb(x: number, y: number, z: number): [number, number, number] {
    return [
      3.2406 * x + -1.5372 * y + -0.4986 * z,
      -0.9689 * x + 1.8758 * y + 0.0415 * z,
      0.0557 * x -0.2040 * y + 1.0570 * z,
    ];
  }

  private static linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
    return [
      0.4124 * r + 0.3576 * g + 0.1805 * b,
      0.2126 * r + 0.7152 * g + 0.0722 * b,
      0.0193 * r + 0.1192 * g + 0.9502 * b,
    ];
  }

  private static applyGamma(value: number): number {
    return value > 0.0031308 ? 1.055 * value ** (1/2.4) - 0.055 : 12.92 * value;
  }

  private static expaneGamma(value: number): number {
    return value > 0.04045 ? ((value + 0.055) / 1.055) ** 2.4 : value / 12.92;
  }

  public static from8bit(r: number, g: number, b: number): Srgb {
    return new Srgb(r / 255, g / 255, b / 255);
  }

  public static fromXyz(xyz: Xyz, strict = false): Srgb {
    const [x, y, z] = xyz.toArray();
    let linearRgb = Srgb.xyzToLinearRgb(x, y, z);
    const min = Math.min(... linearRgb);
    const max = Math.max(... linearRgb);
    if (max > 1) {
      if (strict) {
        throw new Error('Color value overflow');
      }
      const max = Math.max(...linearRgb);
      linearRgb = [linearRgb[0] / max, linearRgb[1] / max, linearRgb[2] / max];
    }
    if (min < 0) {
      if (strict) {
        throw new Error('Color outside the sRGB gamut');
      }
      const bias = 0 - min;
      const biasedLinearRgb: [number, number, number] = [linearRgb[0] + bias, linearRgb[1] + bias, linearRgb[2] + bias];
      const biasedXyz = Srgb.linearRgbToXyz(biasedLinearRgb[0], biasedLinearRgb[1], biasedLinearRgb[2]);
      const ratio = y / biasedXyz[1];
      linearRgb = [biasedLinearRgb[0] * ratio, biasedLinearRgb[1] * ratio, biasedLinearRgb[2] * ratio];
    }

    return new Srgb(Srgb.applyGamma(linearRgb[0]), Srgb.applyGamma(linearRgb[1]), Srgb.applyGamma(linearRgb[2]));
  }

  public constructor(r: number, g: number, b: number) {
    if (!Srgb.validateColorValue(r) || !Srgb.validateColorValue(g) || !Srgb.validateColorValue(b)) {
      throw new Error('Invalid color value');
    }

    this.r = r;
    this.g = g;
    this.b = b;
  }

  public to8bit(): [number, number, number] {
    return [
      Srgb.colorValueTo8bit(this.r),
      Srgb.colorValueTo8bit(this.g),
      Srgb.colorValueTo8bit(this.b),
    ];
  }

  public toXyz(): Xyz {
    const xyz = Srgb.linearRgbToXyz(Srgb.expaneGamma(this.r), Srgb.expaneGamma(this.g), Srgb.expaneGamma(this.b));
    return new Xyz(xyz[0], xyz[1], xyz[2]);
  }
}
