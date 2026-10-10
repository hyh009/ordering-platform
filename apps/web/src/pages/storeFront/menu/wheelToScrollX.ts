/** A line-mode wheel reports lines, not pixels; this is the usual line height. */
const LINE_HEIGHT_PX = 16;

type WheelReading = {
  deltaX: number;
  deltaY: number;
  /** `WheelEvent.deltaMode`: 1 counts lines, anything else counts pixels. */
  deltaMode: number;
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
};

/**
 * Where a wheel should leave a horizontal strip, or `null` to let the wheel
 * through untouched.
 *
 * `null` for a strip that fits, for a horizontal wheel — a tilt wheel, a
 * trackpad, which the browser already handles — and, the one that matters, for
 * a strip already at the end the wheel is pushing towards: scrolling past the
 * last card then carries on down the transcript instead of stopping dead.
 */
export function nextScrollLeft(reading: WheelReading): number | null {
  if (reading.deltaY === 0 || reading.deltaX !== 0) return null;

  const maxScrollLeft = reading.scrollWidth - reading.clientWidth;
  if (maxScrollLeft <= 0) return null;

  const delta =
    reading.deltaMode === 1 ? reading.deltaY * LINE_HEIGHT_PX : reading.deltaY;
  const next = Math.min(Math.max(reading.scrollLeft + delta, 0), maxScrollLeft);
  return next === reading.scrollLeft ? null : next;
}

/**
 * Let a plain mouse wheel scroll a horizontal strip sideways. Attach it as the
 * strip's `ref`.
 *
 * A horizontal row has no vertical scroll of its own, so a wheel over it does
 * nothing a desktop guest can see: a trackpad swipes, a touch screen swipes,
 * and a plain mouse has neither. Mapping the wheel gives that mouse the one
 * gesture it has.
 *
 * A module function rather than a hook, because it closes over nothing: one
 * identity for every render means React attaches the listener once instead of
 * tearing it down and rebuilding it on each pass.
 *
 * The listener is attached by hand rather than through `onWheel`, because React
 * registers wheel at the root as passive and a passive listener cannot
 * `preventDefault`, which is what keeps the page from scrolling too.
 */
export function bindWheelToScrollX(node: HTMLElement | null) {
  if (!node) return;

  const onWheel = (event: WheelEvent) => {
    const next = nextScrollLeft({
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaMode: event.deltaMode,
      scrollLeft: node.scrollLeft,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    });
    if (next === null) return;

    event.preventDefault();
    node.scrollLeft = next;
  };

  node.addEventListener('wheel', onWheel, { passive: false });
  return () => node.removeEventListener('wheel', onWheel);
}
