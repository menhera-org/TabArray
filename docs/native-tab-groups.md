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
- Pinned tabs are excluded from the accounting because Firefox does not associate them with tab groups; pin/unpin events trigger reconciliation so windows that only have pinned tabs drop out of the native-mirroring flow automatically.

## Follow-ups
- Reconfirm the Firefox version once Mozilla publishes the stable release notes and adjust the gate if needed.
- Expand the reconciliation logic so future updates can synchronize ordering (using `browser.tabGroups.onMoved`) and propagate container-initiated renames in real time.
