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

import browser from 'webextension-polyfill';
import { ExtensionService } from '../frameworks/extension';

const extensionService = ExtensionService.getInstance();

type FileDetails = {
  name: string;
  contentLength: number;
  isDirectory: boolean;
};

const createHtml = (path: string, files: FileDetails[]): string => {
  const doc = document.implementation.createHTMLDocument(path);
  return doc.documentElement.outerHTML;
};

const rewriteResponse = (data: string) => {
  console.log('rewriteResponse', data);
  const lines = data.split('\n').filter((line) => line.length > 0);
  const files: FileDetails[] = [];
  let path = '';
  for (const line of lines) {
    const [code, filename, contentLength, /* lastModified */, fileType] = line.split(' ');
    if (code == '300:' && filename != null) {
      path = filename;
      continue;
    }
    if (code != '201:' || filename == null || contentLength == null || fileType == null) {
      continue;
    }
    files.push({
      name: filename,
      contentLength: parseInt(contentLength, 10),
      isDirectory: fileType == 'DIRECTORY',
    });
  }
  return createHtml(path, files);
};

const createStreamFilter = (requestId: string): browser.WebRequest.StreamFilter => {
  const filter = browser.webRequest.filterResponseData(requestId);
  let data = '';
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  filter.ondata = (event) => {
    console.log(`filter.ondata received ${event.data.byteLength} bytes`);
    data += decoder.decode(event.data, {stream: true});
  };

  filter.onstop = () => {
    filter.write(encoder.encode(rewriteResponse(data)));

    // The extension should always call filter.close() or filter.disconnect()
    // after creating the StreamFilter, otherwise the response is kept alive forever.
    // If processing of the response data is finished, use close. If any remaining
    // response data should be processed by Firefox, use disconnect.
    filter.close();
  };

  return filter;
};

const filter: browser.WebRequest.RequestFilter = {
  urls: [
    `moz-extension://${extensionService.getInternalUuid()}/*`, // all HTTP/HTTPS requests.
  ],
  types: [
    'main_frame', // top-level windows.
  ],
};

browser.webRequest.onBeforeRequest.addListener((details) => {
  const url = new URL(details.url);
  if (url.pathname.endsWith('/')) {
    createStreamFilter(details.requestId);
  }
  return {};
}, filter, ['blocking']);

browser.webRequest.onHeadersReceived.addListener((details) => {
  const url = new URL(details.url);
  const responseHeaders = details.responseHeaders;
  if (url.pathname.endsWith('/') && responseHeaders != null) {
    responseHeaders.push({
      name: 'Content-Type',
      value: 'text/html; charset=utf-8',
    });
  }
  return { responseHeaders };
}, filter, ['blocking']);
