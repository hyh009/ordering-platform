import { useCallback, useEffect, useRef, useState } from 'react';

/** Nearest scrollable ancestor — the element a `scrollIntoView` actually moves. */
function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
    el = el.parentElement;
  }
  return null;
}

type RefCallback = (node: HTMLElement | null) => void | (() => void);

/**
 * Keep `set` in sync with an element's rounded height via ResizeObserver, and
 * return the React-19 ref cleanup. Rounding avoids sub-pixel churn that would
 * otherwise re-render and re-subscribe the scroll-spy observer.
 */
function observeHeight(
  node: HTMLElement | null,
  set: (height: number) => void,
) {
  if (!node) return;
  const measure = () => set(Math.round(node.getBoundingClientRect().height));
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(node);
  return () => observer.disconnect();
}

export interface ScrollSpyTabs {
  /** Key of the section under the pinned band, or the first key as a fallback. */
  activeKey: string | null;
  /** Measured sticky-header height; pin the tab strip at this offset. */
  headerHeight: number;
  /** Header + tab strip height; sections clear this and scroll-spy ignores it. */
  pinnedHeight: number;
  /** Attach to the sticky header to measure it. */
  bindHeader: RefCallback;
  /** Attach to the tab strip to measure it. */
  bindTabs: RefCallback;
  /** Attach to each section, keyed the same as `keys`. */
  bindSection: (key: string) => RefCallback;
  /** Smooth-scroll to a section and pin its tab for the animation. */
  scrollToCategory: (key: string) => void;
}

/**
 * Pure-UI scroll behavior for a "sticky header + pinned tab strip + sections"
 * layout: measures the pinned band, scrolls to a section on demand, and tracks
 * (scroll-spy) which section sits under the band. It owns no business state —
 * the caller passes the ordered section `keys` (derived from display data) and
 * wires the returned binders/handlers in the view.
 */
export function useScrollSpyTabs(keys: string[]): ScrollSpyTabs {
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  // The header scrolls away; only the tab strip pins. We measure both so the
  // tabs can pin right below the header and sections can clear the pinned tabs.
  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabsHeight, setTabsHeight] = useState(0);
  const [trackedKey, setTrackedKey] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(false);

  // Stable height binders (their identity must not change, or the ref would
  // detach/reattach and re-create the observer every render). Measuring on
  // attach handles the node mounting only after content finishes loading.
  const bindHeader = useCallback<RefCallback>(
    (node) => observeHeight(node, setHeaderHeight),
    [],
  );
  const bindTabs = useCallback<RefCallback>(
    (node) => observeHeight(node, setTabsHeight),
    [],
  );

  const bindSection = useCallback(
    (key: string): RefCallback =>
      (node) => {
        if (node) sectionRefs.current.set(key, node);
        else sectionRefs.current.delete(key);
      },
    [],
  );

  // While a tap-triggered scroll animates, scroll-spy must not steal the active
  // tab as the page passes through intermediate sections. This lock suppresses
  // it until the scroll settles. `detachSettle` tears down the in-flight
  // settle (its timer + scrollend listener) — both on the next tap and on
  // unmount, so no listener is ever left dangling.
  const programmaticScroll = useRef(false);
  const detachSettle = useRef<(() => void) | null>(null);
  useEffect(() => () => detachSettle.current?.(), []);

  const scrollToCategory = useCallback((key: string) => {
    const node = sectionRefs.current.get(key);
    if (!node) return;
    // Lock scroll-spy and pin the tapped tab for the whole animation.
    programmaticScroll.current = true;
    setTrackedKey(key);
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Replace any in-flight settle from a previous tap.
    detachSettle.current?.();
    const scroller = getScrollParent(node);
    const release = () => {
      programmaticScroll.current = false;
      detachSettle.current?.();
    };
    // Prefer `scrollend`; fall back to a timeout where it is unsupported
    // (older iOS Safari) or never fires (the target was already in place).
    const timer = setTimeout(release, 700);
    scroller?.addEventListener('scrollend', release);
    detachSettle.current = () => {
      clearTimeout(timer);
      scroller?.removeEventListener('scrollend', release);
      detachSettle.current = null;
    };
  }, []);

  // Pinned height the tabs occupy once stuck below the header. Sections clear it
  // when scrolled to, and scroll-spy ignores this top band.
  const pinnedHeight = headerHeight + tabsHeight;
  // Stable dependency for the observer: re-observe when the section set changes.
  const keysSignature = keys.join(',');

  // Force-activate the last tab when the user has scrolled to near the bottom,
  // because the last section is often too short to enter the scroll-spy zone.
  useEffect(() => {
    if (keysSignature === '') return;
    const firstSection = [...sectionRefs.current.values()][0];
    const scroller =
      (firstSection ? getScrollParent(firstSection) : null) ??
      document.documentElement;
    const checkBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      setAtBottom(scrollTop + clientHeight >= scrollHeight * 0.95);
    };
    scroller.addEventListener('scroll', checkBottom, { passive: true });
    checkBottom();
    return () => scroller.removeEventListener('scroll', checkBottom);
  }, [keysSignature]);

  // Scroll-spy: highlight the tab whose section sits just below the pinned tabs.
  // The top inset hides the pinned band; the bottom inset keeps the active row
  // near the top so the last section can still win.
  useEffect(() => {
    if (keysSignature === '') return;
    const sections = sectionRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        // A tap-triggered scroll owns the active tab until it settles.
        if (programmaticScroll.current) return;
        const topmost = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (!topmost) return;
        // Recover the key from our own registry rather than a DOM attribute, so
        // the hook stays self-contained (no `data-*` contract with the view).
        for (const [key, node] of sections) {
          if (node === topmost.target) {
            setTrackedKey(key);
            break;
          }
        }
      },
      { rootMargin: `-${pinnedHeight + 1}px 0px -70% 0px`, threshold: 0 },
    );
    for (const node of sections.values()) observer.observe(node);
    return () => observer.disconnect();
  }, [keysSignature, pinnedHeight]);

  const lastKey = keys[keys.length - 1] ?? null;
  const activeKey =
    atBottom && lastKey ? lastKey : (trackedKey ?? keys[0] ?? null);

  return {
    activeKey,
    headerHeight,
    pinnedHeight,
    bindHeader,
    bindTabs,
    bindSection,
    scrollToCategory,
  };
}
