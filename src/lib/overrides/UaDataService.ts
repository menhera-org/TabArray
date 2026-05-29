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

export class UaDataService {
  private static readonly INSTANCE = new UaDataService();

  public static getInstance(): UaDataService {
    return UaDataService.INSTANCE;
  }

  private constructor() {
    // nothing
  }

  private getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomSymbol() {
    const symbols = ['_', '-', ':', '.', '?', '!', ' '];
    return symbols[this.getRandomInt(0, symbols.length - 1)] as string;
  }

  private getNotABrand() {
    return 'Not' + this.getRandomSymbol() + 'A' + this.getRandomSymbol() + 'Brand';
  }

  private getRandomVersion() {
    return `${this.getRandomInt(1, 99)}.${this.getRandomInt(0, 9999)}.${this.getRandomInt(0, 9999)}.${this.getRandomInt(0, 9999)}`;
  }

  public getHighEntropyBrands(userAgent: string) {
    const brands = [];
    const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
    if (chromeMatch) {
      brands.push({ brand: 'Chromium', version: chromeMatch[1] as string });
      const edgeMatch = userAgent.match(/Edg\/([\d.]+)/);
      const operaMatch = userAgent.match(/OPR\/([\d.]+)/);
      if (edgeMatch) {
        brands.push({ brand: 'Microsoft Edge', version: edgeMatch[1] as string });
      } else if (operaMatch) {
        brands.push({ brand: 'Opera', version: operaMatch[1] as string });
      } else {
        brands.push({ brand: 'Google Chrome', version: chromeMatch[1] as string });
      }
      brands.push({ brand: this.getNotABrand(), version: this.getRandomVersion() });
    }
    return brands;
  }

  public getBrands(userAgent: string) {
    const highEntropyBrands = this.getHighEntropyBrands(userAgent);
    return highEntropyBrands.map((brand) => {
      const version = brand.version.split('.')[0] as string;
      return {
        brand: brand.brand,
        version: version,
      };
    });
  }
}
