import { describe, expect, it } from 'bun:test';
import { ragFor, RAG_THRESHOLDS, __testing } from '../utils/scheduleRisks.js';
const { toDateString } = __testing;
describe('ragFor — BR-05 thresholds', () => {
    it('maps SPI onto the three bands', () => {
        expect(ragFor(1.2)).toBe('green');
        expect(ragFor(0.95)).toBe('green');
        expect(ragFor(0.94)).toBe('amber');
        expect(ragFor(0.8)).toBe('amber');
        expect(ragFor(0.79)).toBe('red');
        expect(ragFor(0)).toBe('red');
    });
    it('has no RAG without an SPI, which ck_pms_spi_rag_pair requires', () => {
        expect(ragFor(null)).toBeNull();
    });
    it('reads its thresholds from configuration rather than literals (OQ-FN-01)', () => {
        expect(RAG_THRESHOLDS.green).toBe(0.95);
        expect(RAG_THRESHOLDS.amber).toBe(0.8);
        expect(RAG_THRESHOLDS.green).toBeGreaterThan(RAG_THRESHOLDS.amber);
    });
});
describe('toDateString', () => {
    it('keeps the calendar date pg handed back, instead of shifting it through UTC', () => {
        // pg returns a `date` as local midnight. In any zone east of UTC, toISOString() on
        // 2026-09-14T00:00+03:00 yields 2026-09-13 — a schedule dated a day early.
        const localMidnight = new Date(2026, 8, 14, 0, 0, 0);
        expect(toDateString(localMidnight)).toBe('2026-09-14');
    });
    it('pads single-digit months and days', () => {
        expect(toDateString(new Date(2026, 0, 5, 0, 0, 0))).toBe('2026-01-05');
    });
    it('passes a date string through untouched', () => {
        expect(toDateString('2026-09-14')).toBe('2026-09-14');
        expect(toDateString('2026-09-14T17:00:00')).toBe('2026-09-14');
    });
});
