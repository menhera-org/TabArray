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

import browser from 'webextension-polyfill';
import { ed25519 } from '@noble/curves/ed25519.js';

import { ServiceRegistry } from '../ServiceRegistry';

import { CTG_OFFCIAL_SIGNATURE_URL, CTG_OFFICIAL_ED25519_SIGNING_KEY } from "../../defs";

const fromHexString = (hexString: string) =>
  Uint8Array.from(hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)).map(byte => byte | 0) ?? []);

/**
 * Cryptographically saying, verifying the codes using the same codebase makes little sense,
 * however, it is a convenient way to determine if it is an official build.
 */
export class BuildMetadataService {
  private static readonly INSTANCE = new BuildMetadataService();

  public static getInstance(): BuildMetadataService {
    return BuildMetadataService.INSTANCE;
  }

  private constructor() {
    // Do nothing
  }

  private base64Decode(input: string): Uint8Array {
    const raw = atob(input);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }

  public getSignatureUrl(integrityHash: string): string {
    const version = browser.runtime.getManifest().version;
    return CTG_OFFCIAL_SIGNATURE_URL.replace('%VERSION%', version).replace('%HASH%', integrityHash);
  }

  public async verifySignature(integrityHash: string, signingKey = CTG_OFFICIAL_ED25519_SIGNING_KEY): Promise<boolean> {
    const res = await fetch(this.getSignatureUrl(integrityHash));
    if (res.status != 200) {
      return false;
    }
    const { metadata, signature } = await res.json() as { metadata: string, signature: string, publicKey: string };
    const signatureByteArray = this.base64Decode(signature);
    const byteArray = this.base64Decode(metadata);
    if (!ed25519.verify(signatureByteArray, byteArray, fromHexString(signingKey))) {
      return false;
    }
    const metadataJson = new TextDecoder().decode(byteArray);
    const metadataObject = JSON.parse(metadataJson);
    return metadataObject.hash == integrityHash;
  }
}

ServiceRegistry.getInstance().registerService('BuildMetadataService', BuildMetadataService.getInstance());
