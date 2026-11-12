# Privacy Policy

Container Tab Groups works inside Firefox. It collects no data about you, and it sends nothing about your tabs, the sites you visit or your settings to us or to anyone else.

## What stays in Firefox

The extension saves its settings and its own state, such as your container groups, in Firefox's storage for extensions on your computer. Removing the extension deletes them.

It is designed not to store data from private browsing. You decide whether it runs in private windows: Firefox asks you to allow it there.

**Save Debugging Information** writes a file to your computer and nowhere else. It holds the extension's settings, its recent log messages, which can include addresses of pages you opened, and how many tabs each window had over time. Read it before you share it with anyone.

## Network requests the extension makes

The extension connects to the following servers, and only in these cases:

- **Check for Official Build.** When you click this button in the help view, the extension downloads this version's signature from `downloads.menhera.org`, our server. The request names the extension's version and a hash of its files. Like any web server, ours also receives your IP address with the request. The extension makes no request until you click the button.
- **Public suffix list.** On Firefox 140 to 152, which lack a built-in list of registrable domains, the extension downloads the public list from `publicsuffix.org` at most once a day. The request contains nothing about you, apart from your IP address. Firefox 153 and later have the list built in, so no download happens there.

## Firefox Sync

With **Sync Containers** turned on, the extension saves your containers and container groups (their names, colors, icons and arrangement) in Firefox's synced storage. If you use Firefox Sync, Firefox then copies them to your other devices. Mozilla handles that data under the [Mozilla Privacy Notice](https://www.mozilla.org/privacy/firefox/), and we have no access to it.

## Settings that change where your traffic goes

These features act on your traffic only when you set them up:

- **Proxies.** If you assign a proxy to a container, that container's traffic goes through the proxy you chose.
- **Language and user agent overrides.** If you set these for a container, sites you visit in it receive the language and user agent you chose instead of Firefox's own.
