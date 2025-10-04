# Native tab group integration

## Firefox version baseline
- The WebExtensions `browser.tabGroups` API is guarded by `NativeTabGroupFeatureGate.MINIMUM_SUPPORTED_VERSION` (currently 130). Update this constant if Mozilla ships the API behind a different milestone.
- Runtime checks also verify that `browser.tabGroups` exists so Nightly/Beta users with the pref disabled will gracefully fall back to the container-only flow.

## Detection approach
- `NativeTabGroupFeatureGate.isNativeTabGroupSupported()` first checks that the namespace exposes the expected lifecycle methods (query/update/move/remove) and returns true immediately when that capability lands. Otherwise it falls back to the browser-version guard (major segment of `browser.runtime.getBrowserInfo().version`).
- `assertNativeSupport()` is a helper for startup paths that must fail fast when we expect native tab groups to be available (for example, after a stored mapping confirms the user previously had the feature).

## Startup cleanup
- `NativeTabGroupSyncService` currently focuses on pruning native tab groups that were previously associated with containers that no longer exist. The mapping store (`NativeTabGroupMappingStore`) keeps track of container → native group IDs so removals can be applied exactly once.
- Non-managed containers (default and private store) are excluded from the cleanup, preventing us from touching user-created native groups that do not correspond to contextual identities.
- The sync pass also recreates missing native tab groups and aligns their titles with the corresponding container names. Native-side renames now call back into `browser.contextualIdentities.update()` so the displayed container label tracks the group immediately.
- Mapping now scopes to individual windows: if a container has no tabs in a window we delete the mapped native group there, while windows with active tabs get their own native instance so multiple windows can host the same container in parallel.
- Group creation is handled via `browser.tabs.group({ createProperties })` (the tabGroups API does not provide a direct create method), and we immediately update the resulting group metadata through `browser.tabGroups.update` to inject container titles/colors.
- During reconciliation we gather the non-pinned tab IDs per container/window and pass them to `browser.tabs.group` so the native group actually contains the same set of tabs (re-grouping on subsequent passes keeps new tabs enrolled).
- Pinned tabs are excluded from the accounting because Firefox does not associate them with tab groups; pin/unpin events trigger reconciliation so windows that only have pinned tabs drop out of the native-mirroring flow automatically.
- Manual tab sorting is disabled whenever native groups are available; on startup we translate the container order into `browser.tabGroups.move` calls per window so native groups mirror the UI ordering.
- Container show/hide now collapses or expands the corresponding native group (instead of hiding tabs) while still focusing the correct fallback tab.
- Tab creation, movement, and user-initiated tab opens all funnel through the native coordinator so tabs land in the correct native group (creating it if needed) even for manual Firefox actions.
- Container and native colors stay in sync via a shared mapper (grey ↔ toolbar, cyan ↔ turquoise, etc.), so changing colors on either side immediately updates the counterpart.
- Tabs that are not in a container get their own per-window native group labelled with the localized `noContainer` string, keeping “loose” tabs organised alongside container groups.

## Follow-ups
- Reconfirm the Firefox version once Mozilla publishes the stable release notes and adjust the gate if needed.
- Monitor future Firefox releases for additional tab group APIs (e.g., bulk move/collapse events) that could simplify the coordinator logic.
