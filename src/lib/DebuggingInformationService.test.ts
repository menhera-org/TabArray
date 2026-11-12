import { expect, test } from 'vitest';

import { redactUuids } from './DebuggingInformationService';

test('debugging information names no extension UUID', () => {
  const uuid = '0a1b2c3d-4e5f-6a7b-8c9d-0E1F2A3B4C5D';
  expect(redactUuids(`to moz-extension://${uuid}/pages/navigation/confirm.html?urlId=${'ab'.repeat(16)}`)).toBe(
    `to moz-extension://(uuid)/pages/navigation/confirm.html?urlId=${'ab'.repeat(16)}`
  );
});
