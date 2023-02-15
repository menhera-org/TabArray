// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import { Srgb } from "./Srgb";

export class CssColor {
  public readonly srgb: Srgb;
  public readonly alpha: number;

  public constructor(srgb: Srgb, alpha: number) {
    this.srgb = srgb;
    this.alpha = alpha;
  }

  private static fromRgbString(rgbString: string): CssColor | null {
    const rgbMatches = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatches && rgbMatches[1] && rgbMatches[2] && rgbMatches[3]) {
      return new CssColor(
        Srgb.from8bit(
          parseInt(rgbMatches[1]), parseInt(rgbMatches[2]), parseInt(rgbMatches[3])
        ),
        1
      );
    }
    return null;
  }

  private static fromColorCodeString(colorCodeString: string): CssColor | null {
    const colorCodeMatches = colorCodeString.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (colorCodeMatches && colorCodeMatches[1]) {
      const colorCode = colorCodeMatches[1];
      if (colorCode.length === 3) {
        return new CssColor(
          Srgb.from8bit(
            parseInt(colorCode[0] ?? '' + colorCode[0] ?? '', 16),
            parseInt(colorCode[1] ?? '' + colorCode[1] ?? '', 16),
            parseInt(colorCode[2] ?? '' + colorCode[2] ?? '', 16)
          ),
          1
        );
      } else if (colorCode.length === 6) {
        return new CssColor(
          Srgb.from8bit(
            parseInt(colorCode[0] ?? '' + colorCode[1] ?? '', 16),
            parseInt(colorCode[2] ?? '' + colorCode[3] ?? '', 16),
            parseInt(colorCode[4] ?? '' + colorCode[5] ?? '', 16)
          ),
          1
        );
      }
    }
    return null;
  }

  private static fromRgbaString(rgbaString: string): CssColor | null {
    const rgbaMatches = rgbaString.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d*(?:\.\d+)?)\)$/);
    if (rgbaMatches && rgbaMatches[1] && rgbaMatches[2] && rgbaMatches[3] && rgbaMatches[4]) {
      return new CssColor(
        Srgb.from8bit(
          parseInt(rgbaMatches[1]), parseInt(rgbaMatches[2]), parseInt(rgbaMatches[3])
        ),
        parseFloat(rgbaMatches[4])
      );
    }
    return null;
  }

  public static fromString(cssString: string): CssColor {
    // TODO: Add support for hsl, hsla, and named colors
    const cssColor = CssColor.fromColorCodeString(cssString) ?? CssColor.fromRgbString(cssString) ?? CssColor.fromRgbaString(cssString);
    if (cssColor) {
      return cssColor;
    }

    throw new Error(`Invalid CSS color string: ${cssString}`);
  }

  public toString(): string {
    const rgb = this.srgb.to8bit();
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${this.alpha})`;
  }
}
