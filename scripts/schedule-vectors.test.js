import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VECTORS_FILE, renderVectors } from './schedule-vectors.js';
import { SCHEMA_ID_BASE, createAjv } from './validate.js';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const fileContent = readFileSync(VECTORS_FILE, 'utf8');
const vectors = JSON.parse(fileContent);
const byName = Object.fromEntries(vectors.expansion.map((c) => [c.name, c]));
const utcOf = (name) => byName[name].expected.map((r) => r.utc);
const localOf = (name) => byName[name].expected.map((r) => r.local);

// Hand-checked expectations, written independently of the generator. Europe/Budapest is UTC+1 (CET) until
// 2026-03-29 01:00 UTC, UTC+2 (CEST) until 2026-10-25 01:00 UTC, then UTC+1 again.
describe('schedule/test-vectors.json – hand-checked cases', () => {
  test('interval 20:00–08:00 every 60 minutes: 13 rounds, both ends included', () => {
    assert.deepEqual(localOf('interval-20-08-hourly-13-rounds'), [
      '2026-11-03T20:00:00+01:00', '2026-11-03T21:00:00+01:00', '2026-11-03T22:00:00+01:00', '2026-11-03T23:00:00+01:00',
      '2026-11-04T00:00:00+01:00', '2026-11-04T01:00:00+01:00', '2026-11-04T02:00:00+01:00', '2026-11-04T03:00:00+01:00',
      '2026-11-04T04:00:00+01:00', '2026-11-04T05:00:00+01:00', '2026-11-04T06:00:00+01:00', '2026-11-04T07:00:00+01:00',
      '2026-11-04T08:00:00+01:00',
    ]);
    assert.equal(utcOf('interval-20-08-hourly-13-rounds')[0], '2026-11-03T19:00:00.000Z');
    assert.equal(utcOf('interval-20-08-hourly-13-rounds')[12], '2026-11-04T07:00:00.000Z');
  });

  test('list across midnight belongs to the start day', () => {
    const c = byName['list-across-midnight'];
    assert.deepEqual(c.expected.map((r) => [r.start_day, r.local]), [
      ['2026-11-03', '2026-11-03T22:00:00+01:00'],
      ['2026-11-03', '2026-11-04T00:00:00+01:00'],
      ['2026-11-03', '2026-11-04T02:00:00+01:00'],
      ['2026-11-03', '2026-11-04T04:00:00+01:00'],
    ]);
    assert.deepEqual(localOf('list-increasing-from-early-morning'), ['2026-11-03T02:00:00+01:00', '2026-11-03T20:00:00+01:00']);
  });

  test('interval end that is not on a step, and a same-day interval', () => {
    assert.deepEqual(byName['interval-end-not-on-step'].expected.map((r) => r.wall_time), ['20:00', '20:50', '21:40', '22:30']);
    assert.deepEqual(byName['interval-same-day'].expected.map((r) => r.wall_time), ['08:00', '10:00', '12:00']);
  });

  test('weekdays filter the start day (2026-11-06 is a Friday)', () => {
    assert.deepEqual(byName['weekdays-friday-window-includes-saturday-morning'].expected.map((r) => [r.start_day, r.local]), [
      ['2026-11-06', '2026-11-06T20:00:00+01:00'],
      ['2026-11-06', '2026-11-07T00:00:00+01:00'],
      ['2026-11-06', '2026-11-07T04:00:00+01:00'],
      ['2026-11-06', '2026-11-07T08:00:00+01:00'],
    ]);
    assert.deepEqual(byName['weekdays-friday-window-not-in-saturday-period'].expected, []);
    assert.deepEqual(byName['weekdays-monday-to-friday'].expected.map((r) => r.start_day),
      ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  });

  test('spring DST night: 02:00 does not exist → 03:00 CEST, merged with the 03:00 step', () => {
    assert.deepEqual(utcOf('dst-spring-interval-hourly'), [
      '2026-03-28T19:00:00.000Z', '2026-03-28T20:00:00.000Z', '2026-03-28T21:00:00.000Z', '2026-03-28T22:00:00.000Z', // 20–23 CET
      '2026-03-28T23:00:00.000Z', '2026-03-29T00:00:00.000Z', // 00, 01 CET
      '2026-03-29T01:00:00.000Z', // 02 (nonexistent) → 03:00 CEST; the 03:00 step is the same instant
      '2026-03-29T02:00:00.000Z', '2026-03-29T03:00:00.000Z', '2026-03-29T04:00:00.000Z', '2026-03-29T05:00:00.000Z', '2026-03-29T06:00:00.000Z', // 04–08 CEST
    ]);
    assert.equal(byName['dst-spring-interval-hourly'].expected[6].wall_time, '02:00');
    assert.equal(byName['dst-spring-interval-hourly'].expected[6].local, '2026-03-29T03:00:00+02:00');
  });

  test('spring DST: 02:30 → 03:00 CEST (not 03:30), and a collapsing 15-minute interval', () => {
    assert.deepEqual(localOf('dst-spring-list-nonexistent-0230'), ['2026-03-29T01:30:00+01:00', '2026-03-29T03:00:00+02:00', '2026-03-29T03:30:00+02:00']);
    assert.deepEqual(utcOf('dst-spring-list-nonexistent-0230'), ['2026-03-29T00:30:00.000Z', '2026-03-29T01:00:00.000Z', '2026-03-29T01:30:00.000Z']);
    assert.deepEqual(utcOf('dst-spring-every-15-collapse'), ['2026-03-29T00:45:00.000Z', '2026-03-29T01:00:00.000Z', '2026-03-29T01:15:00.000Z']);
  });

  test('autumn DST night: 02:00 occurs twice → first occurrence (CEST)', () => {
    assert.deepEqual(utcOf('dst-autumn-interval-hourly'), [
      '2026-10-24T18:00:00.000Z', '2026-10-24T19:00:00.000Z', '2026-10-24T20:00:00.000Z', '2026-10-24T21:00:00.000Z', // 20–23 CEST
      '2026-10-24T22:00:00.000Z', '2026-10-24T23:00:00.000Z', // 00, 01 CEST
      '2026-10-25T00:00:00.000Z', // 02 CEST (first occurrence)
      '2026-10-25T02:00:00.000Z', '2026-10-25T03:00:00.000Z', '2026-10-25T04:00:00.000Z', '2026-10-25T05:00:00.000Z', '2026-10-25T06:00:00.000Z', '2026-10-25T07:00:00.000Z', // 03–08 CET
    ]);
    assert.deepEqual(localOf('dst-autumn-list-ambiguous-0230'), ['2026-10-25T02:30:00+02:00']);
    assert.deepEqual(utcOf('dst-autumn-every-30'), [
      '2026-10-24T23:30:00.000Z', '2026-10-25T00:00:00.000Z', '2026-10-25T00:30:00.000Z', '2026-10-25T02:00:00.000Z', '2026-10-25T02:30:00.000Z',
    ]);
  });

  test('the site time zone is used', () => {
    assert.deepEqual(utcOf('utc-timezone'), ['2026-03-28T22:00:00.000Z', '2026-03-29T00:00:00.000Z', '2026-03-29T02:00:00.000Z']);
    assert.deepEqual(localOf('utc-timezone'), ['2026-03-28T22:00:00+00:00', '2026-03-29T00:00:00+00:00', '2026-03-29T02:00:00+00:00']);
  });

  test('default time limit', () => {
    assert.deepEqual(vectors.time_limit_default.map((c) => [c.walk_duration_s, c.time_limit_min]), [
      [null, 20], [0, 5], [1, 5], [200, 5], [201, 10], [600, 15], [601, 20], [840, 25], [3600, 90], [57600, 1440], [57601, 1440], [86400, 1440],
    ]);
  });
});

describe('schedule/test-vectors.json – consistency', () => {
  test('is byte-identical to a fresh generator run, and the generator is deterministic', () => {
    assert.equal(renderVectors(), renderVectors());
    assert.equal(fileContent, renderVectors(), 'schedule/test-vectors.json is out of date; run: npm run vectors:schedule');
  });

  test('every schedule is a valid entities/schedule.json instance', () => {
    const ajv = createAjv();
    for (const file of ['common/uuid', 'common/timestamp', 'common/local-time', 'entities/schedule']) {
      ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, 'schemas', `${file}.json`), 'utf8')));
    }
    const validate = ajv.getSchema(`${SCHEMA_ID_BASE}entities/schedule.json`);
    for (const c of vectors.expansion) assert.ok(validate(c.schedule), `${c.name}: ${JSON.stringify(validate.errors)}`);
  });

  test('every expected round is self-consistent and in time order', () => {
    for (const c of vectors.expansion) {
      let previous = '';
      for (const r of c.expected) {
        assert.match(r.utc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
        assert.equal(new Date(r.local).toISOString(), r.utc, `${c.name}: local and utc denote the same instant`);
        assert.ok(r.utc > previous, `${c.name}: strictly increasing`);
        previous = r.utc;
      }
    }
  });
});
