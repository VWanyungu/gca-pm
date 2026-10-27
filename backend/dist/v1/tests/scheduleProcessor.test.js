import { describe, expect, it } from 'bun:test';
import { __testing } from '../utils/scheduleProcessor.js';
const { revisionDiffers, toRevisionFields } = __testing;
const START = new Date('2026-08-24T05:00:00.000Z');
const FINISH = new Date('2026-09-09T14:00:00.000Z');
const parsedTask = (over = {}) => ({
    mpp_unique_id: 1,
    parent_mpp_unique_id: null,
    outline_level: 2,
    wbs: '1.3',
    task_name: 'Preliminaries and Mobilization',
    duration_minutes: 4140,
    baseline_start: null,
    baseline_finish: null,
    start: '2026-08-24T08:00:00',
    expected_finish: '2026-09-09T17:00:00',
    actual_start: null,
    actual_finish: null,
    pct_work_complete: 17,
    planned_pct_complete: 17,
    is_milestone: false,
    is_summary: true,
    is_critical: false,
    is_active: true,
    task_type: 'fixed_duration',
    predecessors: [3, 4],
    resource_names: ['Contractor', 'Client'],
    ...over,
});
const instants = new Map([
    ['2026-08-24T08:00:00', START],
    ['2026-09-09T17:00:00', FINISH],
]);
const fieldsFor = (over = {}) => toRevisionFields(parsedTask(over), new Map([[1, 'task-uuid']]), instants);
/** A revision as pg hands it back: numerics are strings, timestamps are Dates. */
const storedRevision = (over = {}) => ({
    parent_task_id: null,
    outline_level: 2,
    wbs: '1.3',
    task_name: 'Preliminaries and Mobilization',
    duration_minutes: 4140,
    baseline_start: null,
    baseline_finish: null,
    start: START,
    expected_finish: FINISH,
    actual_start: null,
    actual_finish: null,
    pct_work_complete: '17.00',
    planned_pct_complete: '17.00',
    is_milestone: false,
    is_summary: true,
    is_critical: false,
    is_active: true,
    task_type: 'fixed_duration',
    predecessors: [3, 4],
    resource_names: ['Contractor', 'Client'],
    source: 'upload',
    responsible_user_id: null,
    ...over,
});
describe('revisionDiffers — AC-SCH-06 "unchanged tasks write nothing"', () => {
    it('sees no change when a file is re-uploaded untouched', () => {
        expect(revisionDiffers(storedRevision(), fieldsFor())).toBe(false);
    });
    it('is not fooled by pg returning numerics as strings', () => {
        // 17 vs "17.00" is the same progress; a string compare here would rewrite every task
        // on every upload and bury the real changes in schedule history.
        expect(revisionDiffers(storedRevision({ pct_work_complete: '17.00' }), fieldsFor({ pct_work_complete: 17 }))).toBe(false);
        expect(revisionDiffers(storedRevision({ duration_minutes: '4140' }), fieldsFor())).toBe(false);
    });
    it('ignores re-ordering of predecessors and resources', () => {
        expect(revisionDiffers(storedRevision({ predecessors: [4, 3] }), fieldsFor({ predecessors: [3, 4] }))).toBe(false);
        expect(revisionDiffers(storedRevision({ resource_names: ['Client', 'Contractor'] }), fieldsFor())).toBe(false);
    });
    it('ignores responsible_user_id, which the PM owns and an upload must not touch', () => {
        expect(revisionDiffers(storedRevision({ responsible_user_id: 'someone' }), fieldsFor())).toBe(false);
    });
    it.each([
        ['progress', { pct_work_complete: 42 }],
        ['planned progress', { planned_pct_complete: 42 }],
        ['name', { task_name: 'Renamed' }],
        ['duration', { duration_minutes: 4200 }],
        ['wbs', { wbs: '1.4' }],
        ['outline level', { outline_level: 3 }],
        ['milestone flag', { is_milestone: true }],
        ['summary flag', { is_summary: false }],
        ['critical flag', { is_critical: true }],
        ['active flag', { is_active: false }],
        ['task type', { task_type: 'fixed_work' }],
        ['predecessors', { predecessors: [3, 4, 5] }],
        ['resources', { resource_names: ['Contractor'] }],
    ])('sees a change in %s', (_label, over) => {
        expect(revisionDiffers(storedRevision(), fieldsFor(over))).toBe(true);
    });
    it('sees a change when a date moves', () => {
        const moved = new Map(instants);
        moved.set('2026-09-09T17:00:00', new Date('2026-09-10T14:00:00.000Z'));
        const fields = toRevisionFields(parsedTask(), new Map([[1, 'task-uuid']]), moved);
        expect(revisionDiffers(storedRevision(), fields)).toBe(true);
    });
    it('sees a change when a baseline is added', () => {
        const withBaseline = new Map(instants);
        withBaseline.set('2026-08-01T08:00:00', new Date('2026-08-01T05:00:00.000Z'));
        const fields = toRevisionFields(parsedTask({ baseline_start: '2026-08-01T08:00:00' }), new Map([[1, 'task-uuid']]), withBaseline);
        expect(revisionDiffers(storedRevision(), fields)).toBe(true);
    });
});
describe('toRevisionFields', () => {
    it('resolves a parent Unique ID to the task uuid (AC-SCH-06)', () => {
        const fields = toRevisionFields(parsedTask({ parent_mpp_unique_id: 55 }), new Map([[1, 'task-uuid'], [55, 'parent-uuid']]), instants);
        expect(fields.parent_task_id).toBe('parent-uuid');
    });
    it('leaves a task top-level rather than dangling when its parent is absent', () => {
        const fields = toRevisionFields(parsedTask({ parent_mpp_unique_id: 999 }), new Map(), instants);
        expect(fields.parent_task_id).toBeNull();
    });
    it('uses the resolved instants, never the raw local strings', () => {
        expect(fieldsFor().start).toEqual(START);
        expect(fieldsFor().baseline_start).toBeNull();
    });
});
