# Organizing containers and tabs

## Change the order of containers

The extension keeps tabs sorted by container. A tab or tab group you drag in the tab bar moves back to its container's place, so change the order in the extension's settings instead.

- To set the order yourself, open the extension's **Settings**, go to the **Sort Containers** tab, and move containers up or down.
- To keep containers in name order, turn on **Sort containers by name** on the **General** tab.
- To arrange tabs by hand, clear **Enable automatic sorting of tabs** on the **General** tab. With **Show containers as Firefox tab groups** on, each container's tabs still stay together in their group, but you can drag the groups and the tabs inside them.

## Close or move several tabs at once

In the popup or the sidebar, Shift-click or Ctrl-click (Cmd-click on macOS) tabs to select them. Then click the close button of any selected tab to close them all, or drag one of them onto a container to reopen them all there. Clicking a tab without a modifier key ends the selection.

## Keep a set of tabs out of sight

1. Put the tabs in a container of their own. To move a tab, use **Reopen in Container** from the extension's button in the address bar, or drag the tab onto a container in the sidebar.
2. Hide the container: in the popup or the sidebar, click **Hide the tabs of this container** next to it.

With **Show containers as Firefox tab groups** on, hiding a container collapses its group in the tab bar, and clicking the group's label shows it again. With the option off, the container's tabs are hidden until you click **Show the tabs of this container**.

To hide every container except the one you are using, turn on **Auto-hide Unused Containers** under **Experimental Features** on the **General** tab.

## Open links from other apps in a chosen container

When another app, such as a mail client, opens a link in Firefox, the extension can pick the container from the link's site.

1. Open the extension's **Settings** and go to the **Sort Containers** tab.
2. In the **Sites from other apps** column, type the sites for each container, separated by commas, for example `example.com, example.org`. A site also covers its subdomains, so `example.com` covers `mail.example.com`. When two containers list matching sites, the more specific one wins.

Links to sites listed for **No Container** stay outside containers. Links to other sites follow **When an external application opens a tab** under **Experimental Features** on the **General** tab.

## Save a container's tabs as bookmarks

In the popup or the sidebar, open a container's options and choose **Save Tabs as Bookmarks**. The first time, Firefox asks to let the extension use your bookmarks. The extension then makes a folder named after the container in **Other Bookmarks**, with a bookmark for each web page open in the container.

To open bookmarks in a container, right-click a bookmark or a bookmark folder and choose a container under **Open in Container**. A folder opens every bookmark directly inside it. This menu is there only while the extension may use your bookmarks.

Firefox restores container tabs with **Open previous windows and tabs**, and a bookmark folder is a copy kept apart from that.

## What moves with a tab to another container

Reopening a tab in another container opens the same address there. Each container has its own cookies and site data, so you are not signed in to the site in the new container.

When you create a container, **Copy cookies from** copies the cookies of another container into it. Other site data, such as local storage, IndexedDB and open sessions, cannot be copied, because Firefox does not let extensions read it.
