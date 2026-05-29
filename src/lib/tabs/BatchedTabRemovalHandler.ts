/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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
  @license
**/

/**
 * Batched tab removal handler to prevent memory leaks and improve performance
 * when removing multiple tabs in quick succession.
 * 
 * This handler debounces tab removal events and processes them in batches,
 * reducing the number of expensive operations and preventing UI freezes.
 */
export class BatchedTabRemovalHandler {
    private static instance: BatchedTabRemovalHandler;
    private static readonly DEBOUNCE_DELAY_MS = 100; // 100ms buffer for batching

    private pendingRemovals = new Set<number>();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Event listener management (simple Observer pattern)
    private listeners: ((tabIds: number[]) => void)[] = [];

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): BatchedTabRemovalHandler {
        if (!BatchedTabRemovalHandler.instance) {
            BatchedTabRemovalHandler.instance = new BatchedTabRemovalHandler();
        }
        return BatchedTabRemovalHandler.instance;
    }

    /**
     * Add a tab ID to the pending removal queue.
     * The removal will be processed after the debounce delay.
     */
    public addRemoval(tabId: number): void {
        this.pendingRemovals.add(tabId);
        this.scheduleProcessing();
    }

    /**
     * Register a listener to be called when a batch of tabs is removed.
     * The listener will receive an array of tab IDs.
     */
    public onBatchRemoved(listener: (tabIds: number[]) => void): void {
        this.listeners.push(listener);
    }

    /**
     * Schedule batch processing with debounce.
     * If called multiple times within the debounce delay, the timer is reset.
     */
    private scheduleProcessing(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.processBatch();
        }, BatchedTabRemovalHandler.DEBOUNCE_DELAY_MS);
    }

    /**
     * Process the batch of pending tab removals.
     * Notifies all registered listeners with the batch of tab IDs.
     */
    private processBatch(): void {
        const tabIds = Array.from(this.pendingRemovals);
        this.pendingRemovals.clear();
        this.debounceTimer = null;

        if (tabIds.length > 0) {
            // Notify all listeners
            this.listeners.forEach(listener => listener(tabIds));
        }
    }
}
