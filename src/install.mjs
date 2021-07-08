// vim: ts=2 et ai
/**
 * Codes to run on first installation.
 */

browser.runtime.onInstalled.addListener((details) => {
  // Enable FPI by defailt on installation
  if ('install' == details.reason) {
    browser.privacy.websites.firstPartyIsolate.get({}).then((details) => {
      if (!details.value) {
        // FPI disabled
        browser.privacy.websites.firstPartyIsolate.set({
          value: true,
        }).catch((e) => console.error(e));
      }
    });
  }
});
