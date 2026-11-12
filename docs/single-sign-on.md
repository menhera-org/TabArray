# Microsoft single sign-on in containers

Firefox can sign you in to Microsoft, work and school accounts with the account you use to sign in to Windows. The setting is **Allow Windows single sign-on for Microsoft, work, and school accounts**, in Firefox settings under Privacy & Security, unless your organization turns it on for you. On macOS, organizations can turn on the same feature for Microsoft Entra ID with a Firefox policy.

Firefox uses single sign-on only in tabs with no container. In a container tab, the sign-in page asks for your password, or refuses to sign you in if your organization only allows known devices. Container Tab Groups does not cause this: Firefox keeps containers apart, and signing in with your Windows account would link every container to that account.

## Turn on single sign-on for a container

1. Find the container's number.
   1. Open `about:support`. Next to **Profile Folder**, click **Open Folder** (**Show in Finder** on macOS).
   2. Open `containers.json` in that folder with a text editor. Each container has a `userContextId`, which is its number. Containers you created show their `name`; the containers Firefox created show an `l10nId` such as `user-context-work` instead. Ignore entries with `"public": false`, which Firefox uses internally.
2. Open `about:config` and accept the warning.
3. Search for the preference below, with `N` replaced by the container's number. Create it as a **Boolean** and set it to `true`.
   - Windows: `network.http.windows-sso.container-enabled.N`
   - macOS: `network.http.microsoft-entra-sso.container-enabled.N`

   For example, for the container with `userContextId` 5 on Windows: `network.http.windows-sso.container-enabled.5`.
4. Reload the sign-in page in a tab of that container.

Repeat this for each container that should sign you in. To turn it off again, set the preference to `false` or delete it.

Sites in a container with single sign-on turned on can recognize your work account, so the container no longer keeps that account separate. Firefox never uses single sign-on in private windows.

See also: [Windows SSO on Mozilla Support](https://support.mozilla.org/kb/windows-sso) and [Firefox bug 1800971](https://bugzilla.mozilla.org/show_bug.cgi?id=1800971), which added the per-container preference.
