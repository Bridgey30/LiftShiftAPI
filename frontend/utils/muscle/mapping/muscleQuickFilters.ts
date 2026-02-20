// ─────────────────────────────────────────────────────────────────────────────
// Quick Filter Categories - DEPRECATED
// This file previously contained PUSH/PULL/LEGS, UPPER/LOWER, ANTERIOR/POSTERIOR filters
// which have been removed as per product requirements.
// File kept for backward compatibility - no quick filters are currently active.
// ─────────────────────────────────────────────────────────────────────────────

/** 
 * Quick filter category type - DEPRECATED
 * Previously used for PPL (Push/Pull/Legs), UL (Upper/Lower), AP (Anterior/Posterior) filters
 * Now kept as a placeholder type for backward compatibility
 */
export type QuickFilterCategory = never;

/** 
 * Display labels for quick filter categories - DEPRECATED
 * Previously mapped filter IDs to display names
 */
export const QUICK_FILTER_LABELS: Readonly<Record<never, string>> = {};

/** 
 * Quick filter category groupings - DEPRECATED
 * Previously grouped filters for UI display
 */
export const QUICK_FILTER_GROUPS: readonly { label: string; filters: never[] }[] = [];

/** 
 * SVG IDs for each quick filter category - DEPRECATED
 * Previously contained muscle mappings for each filter category
 */
export const QUICK_FILTER_SVG_IDS: Readonly<Record<never, readonly string[]>> = {};

/** 
 * Get SVG IDs for a quick filter category - DEPRECATED
 * @deprecated Quick filters have been removed from the application
 */
export const getSvgIdsForQuickFilter = (_category: never): readonly string[] => {
  return [];
};
