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

import { Ipv4Address } from "./Ipv4Address";

export class HostnameService {
  // This must be at the end of static definitions.
  private static readonly INSTANCE = new HostnameService();

  public static getInstance(): HostnameService {
    return this.INSTANCE;
  }

  private constructor() {
    // do nothing.
  }

  public getEncodedDomain(domain: string): string {
    return new URL(`http://${domain}`).hostname;
  }

  /**
   * Note this accepts a url, not a hostname.
   */
  public isHostnameIpAddress(url: string): boolean {
    try {
      const { hostname } = new URL(url);
      if (hostname.startsWith("[")) {
        if (hostname.endsWith("]")) {
          return true;
        }
        throw new Error("Invalid hostname");
      }
      new Ipv4Address(hostname);
      return true;
    } catch (e) {
      return false;
    }
  }

  public compareDomains(domain1: string, domain2: string): number {
    if (domain1 === domain2) {
      return 0;
    } else if (domain1 === '') {
      return -1;
    } else if (domain2 === '') {
      return 1;
    }

    if (this.isHostnameIpAddress(domain1) && this.isHostnameIpAddress(domain2)) {
      return domain1.localeCompare(domain2);
    } else if (this.isHostnameIpAddress(domain1)) {
      return -1;
    } else if (this.isHostnameIpAddress(domain2)) {
      return 1;
    }
    const hostname1 = this.getEncodedDomain(domain1);
    const hostname2 = this.getEncodedDomain(domain2);
    const hostname1Parts = hostname1.split(".");
    const hostname2Parts = hostname2.split(".");
    const hostname1Length = hostname1Parts.length;
    const hostname2Length = hostname2Parts.length;
    const length = Math.min(hostname1Length, hostname2Length);
    for (let i = 0; i < length; i++) {
      const part1 = hostname1Parts[hostname1Length - i - 1] ?? '';
      const part2 = hostname2Parts[hostname2Length - i - 1] ?? '';
      if (part1 !== part2) {
        return part1.localeCompare(part2);
      }
    }
    return hostname1Length - hostname2Length;
  }

  public sortDomains(domains: Iterable<string>): string[] {
    return [...domains].sort((domain1, domain2) => this.compareDomains(domain1, domain2));
  }
}
