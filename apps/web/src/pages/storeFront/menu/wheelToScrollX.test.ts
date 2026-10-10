import { describe, expect, it } from 'vitest';
import { nextScrollLeft } from './wheelToScrollX';

/** A strip of 800px showing 300px of itself, so 500px of it can be reached. */
function strip(reading: Partial<Parameters<typeof nextScrollLeft>[0]>) {
  return nextScrollLeft({
    deltaX: 0,
    deltaY: 0,
    deltaMode: 0,
    scrollLeft: 0,
    scrollWidth: 800,
    clientWidth: 300,
    ...reading,
  });
}

describe('nextScrollLeft', () => {
  it('turns a vertical wheel into sideways movement', () => {
    expect(strip({ deltaY: 120 })).toBe(120);
  });

  it('scrolls back the other way', () => {
    expect(strip({ deltaY: -120, scrollLeft: 300 })).toBe(180);
  });

  it('counts a line-mode wheel in pixels', () => {
    expect(strip({ deltaY: 3, deltaMode: 1 })).toBe(48);
  });

  it('stops at the end instead of overshooting', () => {
    expect(strip({ deltaY: 500, scrollLeft: 400 })).toBe(500);
  });

  it('lets the wheel through once the strip is at its end', () => {
    expect(strip({ deltaY: 120, scrollLeft: 500 })).toBeNull();
  });

  it('lets the wheel through at the start of a backwards scroll', () => {
    expect(strip({ deltaY: -120, scrollLeft: 0 })).toBeNull();
  });

  it('leaves a strip that fits alone', () => {
    expect(strip({ deltaY: 120, scrollWidth: 300 })).toBeNull();
  });

  it('leaves a horizontal wheel to the browser', () => {
    expect(strip({ deltaX: -40, deltaY: 120 })).toBeNull();
  });
});
