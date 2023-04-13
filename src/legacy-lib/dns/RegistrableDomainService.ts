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

import { HostnameService } from "weeg-domains";

/**
 * Rule updates are asynchronous, so if you try to access the rules too early,
 * you may get an empty list.
 */
export class RegistrableDomainService {
  private static readonly PUBLIC_SUFFIX_LIST_URL = 'https://publicsuffix.org/list/public_suffix_list.dat';
  private static readonly HOSTNAME_SERVICE = HostnameService.getInstance();

  private rules = new Set<string>;
  private exceptionRules = new Set<string>;
  private initialized = false;

  private static async fetchList(): Promise<string> {
    const response = await fetch(RegistrableDomainService.PUBLIC_SUFFIX_LIST_URL);
    const text = await response.text();
    return text;
  }

  private static encodeRule(rule: string): string {
    if (rule.startsWith('*.')) {
      const domain = rule.slice(2);
      return '*.' + RegistrableDomainService.HOSTNAME_SERVICE.getEncodedDomain(domain);
    }
    return RegistrableDomainService.HOSTNAME_SERVICE.getEncodedDomain(rule);
  }

  private static parseList(text: string) {
    const lines = text.split('\n');
    const rules = [];
    const exceptionRules = [];
    for (const line of lines) {
      // Skip comments and empty lines.
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.length === 0) {
        continue;
      }
      if (trimmedLine.startsWith('!')) {
        const rawRule = trimmedLine.slice(1);
        const encodedRule = this.encodeRule(rawRule);
        exceptionRules.push(encodedRule);
      } else {
        const encodedRule = this.encodeRule(trimmedLine);
        rules.push(encodedRule);
      }
    }
    return {rules, exceptionRules};
  }

  public importRules(rules: string[], exceptionRules: string[]) {
    this.rules = new Set(rules);
    this.exceptionRules = new Set(exceptionRules);
    this.initialized = true;
  }

  public exportRules(): {rules: string[], exceptionRules: string[]} {
    return {rules: [... this.rules], exceptionRules: [... this.exceptionRules]};
  }

  /**
   * This (or importRules()) must be called once before using the service.
   * This can be called repeatedly (usually once a day) to update the rules.
   */
  public async updateRules(): Promise<void> {
    // Fetches the list of rules from the public suffix list.
    const text = await RegistrableDomainService.fetchList();
    const {rules, exceptionRules} = RegistrableDomainService.parseList(text);
    this.importRules(rules, exceptionRules);
  }

  /**
   * Returns if the rules have been initialized.
   * @returns true if the rules have been initialized.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  private getHostname(url: string): string {
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return '';
    }
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    return urlObj.hostname;
  }

  private getDnsHostname(url: string): string {
    const hostname = this.getHostname(url);
    if (RegistrableDomainService.HOSTNAME_SERVICE.isHostnameIpAddress(url)) {
      return '';
    }
    return hostname;
  }

  public getKnownPublicSuffix(url: string): string {
    const domain = this.getDnsHostname(url);
    if (domain.length === 0) {
      return '';
    }

    const names = domain.split('.');
    for (let i = 2; i <= names.length; i++) {
      const domain = names.slice(-i).join('.');
      const parentDomain = names.slice(-i + 1).join('.');
      const wildcardDomain = '*.' + parentDomain;
      if (this.exceptionRules.has(domain)) {
        return parentDomain;
      }
      if (this.exceptionRules.has(wildcardDomain)) {
        return parentDomain;
      }
    }
    for (let i = 1; i < names.length; i++) {
      const domain = names.slice(i).join('.');
      const parentDomain = names.slice(i + 1).join('.');
      const wildcardDomain = '*.' + parentDomain;
      if (this.rules.has(domain)) {
        return domain;
      }
      if (this.rules.has(wildcardDomain)) {
        return domain;
      }
    }
    return '';
  }

  /**
   * Returns the public suffix of the given URL.
   * @param url the url to check
   * @returns the public suffix of the url, or the empty string if the url is
   * not a valid url or is an IP address.
   * @example getPublicSuffix('https://localhost/') returns 'localhost'
   */
  public getPublicSuffix(url: string): string {
    const domain = this.getDnsHostname(url);
    if (domain.length === 0) {
      return '';
    }
    const knownSuffix = this.getKnownPublicSuffix(url);
    if (knownSuffix.length === 0) {
      const parts = domain.split('.');
      return parts.slice(-2).join('.');
    }
    return knownSuffix;
  }

  /**
   * Returns the registrable domain for the given domain.
   * This is for first party domains, so it does not fail with IP addresses.
   * @param url The URL to check. This must be encoded with Punycode.
   * @returns The registrable domain, or the empty string if not applicable.
   */
  public getRegistrableDomain(url: string): string {
    const domain = this.getHostname(url);
    if (domain.length === 0) {
      return '';
    }
    const publicSuffix = this.getPublicSuffix(url);
    if ('' === publicSuffix) {
      return domain;
    }
    const publicSuffixNamesLength = publicSuffix.split('.').length;
    const parts = domain.split('.');
    return parts.slice(-publicSuffixNamesLength - 1).join('.');
  }
}
