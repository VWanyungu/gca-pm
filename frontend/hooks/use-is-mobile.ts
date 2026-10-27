import { useSyncExternalStore } from "react";

/** Tailwind's `md` breakpoint — below it the app switches to its phone layouts. */
const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Only for layouts chosen in JS rather than CSS — the DPR wizard picks between its
 * step flow and its full-page flow, which are different component trees. Anything
 * expressible as a `md:` utility belongs in the class list, not here.
 *
 * The server snapshot is false: it has no viewport, so a phone renders the desktop
 * tree for one paint before hydration corrects it.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
