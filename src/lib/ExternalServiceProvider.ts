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

import { RegistrableDomainService, HostnameService, UrlService } from "weeg-domains";
import { MessagingService, ExtensionService } from "weeg-utils";

import { ServiceRegistry } from "./ServiceRegistry";

export class ExternalServiceProvider {
  private static readonly INSTANCE = new ExternalServiceProvider();

  public static getInstance(): ExternalServiceProvider {
    return ExternalServiceProvider.INSTANCE;
  }

  public readonly serviceRegistry: ServiceRegistry;
  public readonly registrableDomainService: RegistrableDomainService;
  public readonly hostnameService: HostnameService;
  public readonly urlService: UrlService;
  public readonly messagingService: MessagingService;
  public readonly extensionService: ExtensionService;

  private constructor() {
    this.serviceRegistry = ServiceRegistry.getInstance();
    this.registrableDomainService = RegistrableDomainService.getInstance();
    this.serviceRegistry.registerService('RegistrableDomainService', this.registrableDomainService);
    this.hostnameService = HostnameService.getInstance();
    this.serviceRegistry.registerService('HostnameService', this.hostnameService);
    this.urlService = UrlService.getInstance();
    this.serviceRegistry.registerService('UrlService', this.urlService);
    this.messagingService = MessagingService.getInstance();
    this.serviceRegistry.registerService('MessagingService', this.messagingService);
    this.extensionService = ExtensionService.getInstance();
    this.serviceRegistry.registerService('ExtensionService', this.extensionService);
  }
}
