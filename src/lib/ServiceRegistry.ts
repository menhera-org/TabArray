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

declare global {
  // eslint-disable-next-line no-var
  var gServiceRegistry: ServiceRegistry;
}

export class ServiceRegistry {
  private static readonly INSTANCE = new ServiceRegistry();

  public static getInstance(): ServiceRegistry {
    return ServiceRegistry.INSTANCE;
  }

  private readonly serviceMap = new Map<string, unknown>();

  private constructor() {
    // nothing.
  }

  public registerService<T>(aServiceName: string, aService: T): void {
    if (this.serviceMap.has(aServiceName)) {
      throw new Error(`Service ${aServiceName} is already registered.`);
    }
    this.serviceMap.set(aServiceName, aService);
  }

  public getService<T>(aServiceName: string): T {
    const service = this.serviceMap.get(aServiceName);
    if (!service) {
      throw new Error(`Service ${aServiceName} is not registered.`);
    }
    return service as T;
  }

  public hasService(aServiceName: string): boolean {
    return this.serviceMap.has(aServiceName);
  }

  public getServiceNames(): string[] {
    return [...this.serviceMap.keys()];
  }
}

globalThis.gServiceRegistry = ServiceRegistry.getInstance();
