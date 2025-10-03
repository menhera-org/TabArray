# Native tab group integration

## Firefox version baseline
- The WebExtensions `browser.tabGroups` API is guarded by `NativeTabGroupFeatureGate.MINIMUM_SUPPORTED_VERSION` (currently 130). Update this constant if Mozilla ships the API behind a different milestone.
- Runtime checks also verify that `browser.tabGroups` exists so Nightly/Beta users with the pref disabled will gracefully fall back to the container-only flow.

## Detection approach
- `NativeTabGroupFeatureGate.isNativeTabGroupSupported()` wins only when both the API namespace is present and the runtime browser version meets the baseline. Version parsing is done against the major segment of `browser.runtime.getBrowserInfo().version`.
- `assertNativeSupport()` is a helper for startup paths that must fail fast when we expect native tab groups to be available (for example, after a stored mapping confirms the user previously had the feature).

## Startup cleanup
- `NativeTabGroupSyncService` currently focuses on pruning native tab groups that were previously associated with containers that no longer exist. The mapping store (`NativeTabGroupMappingStore`) keeps track of container → native group IDs so removals can be applied exactly once.
- Non-managed containers (default and private store) are excluded from the cleanup, preventing us from touching user-created native groups that do not correspond to contextual identities.

## Follow-ups
- Reconfirm the Firefox version once Mozilla publishes the stable release notes and adjust the gate if needed.
- Expand the reconciliation logic so that it also recreates missing native groups, updates titles when container names change, and synchronizes ordering.
