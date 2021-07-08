// vim: ts=2 et ai

let newTabPage = 'about:newtab';
const privilegedNewTabPages = new Set([
  'about:newtab',
  'about:home',
  'about:blank',
]);

browser.browserSettings.newTabPageOverride.get({}).then((details) => {
  if (!details) return;
  if (!details.value) return;
  newTabPage = details.value;
}).catch(e => console.error(e));

browser.browserSettings.newTabPageOverride.onChange.addListener((details) => {
  if (!details) return;
  if (!details.value) return;
  newTabPage = details.value;
});

export const isNewTabPage = (url) => url == newTabPage;
export const isPrivilegedNewTabPage = (url) => privilegedNewTabPages.has(url);
