#!/usr/bin/env node
// Reference generator of schedule/test-vectors.json: schedule + period → expected round times, and the
// default time limit. The rules are in docs/decisions.md ("Menetrend-kibontás"). Deterministic. Usage:
//   node scripts/schedule-vectors.js          write schedule/test-vectors.json
//   node scripts/schedule-vectors.js --check  exit 1 if the file differs from what would be written
// The file records the tzdata version of the generator (Node's ICU, process.versions.tz). --check renders with the
// file's version, so another tzdata only fails it if the rounds themselves differ; it warns about the difference.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const VECTORS_FILE = resolve(fileURLToPath(import.meta.url), '..', '..', 'schedule', 'test-vectors.json');

const MINUTE = 60_000;
const DAY_MIN = 1440;

// ---------------------------------------------------------------------------------------------------------
// Time zone helpers. "Naive" = wall-clock time encoded as if it were UTC (ms since epoch), so arithmetic on
// local dates and times is plain integer arithmetic.

const formatters = new Map();
function formatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return formatters.get(timeZone);
}

/** Wall-clock time (naive ms) of a UTC instant in the time zone. */
function naiveOf(utcMs, timeZone) {
  const p = Object.fromEntries(formatter(timeZone).formatToParts(new Date(utcMs)).map(({ type, value }) => [type, Number(value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * The UTC instant of a wall-clock time (Q5): if it occurs twice (autumn), the first occurrence; if it does not
 * exist (spring gap), the first valid instant after the gap, i.e. the moment of the change.
 */
export function resolveLocal(naive, timeZone) {
  const offsets = new Set([-DAY_MIN, 0, DAY_MIN].map((d) => naiveOf(naive + d * MINUTE, timeZone) - (naive + d * MINUTE)));
  const matches = [...offsets].map((o) => naive - o).filter((u) => naiveOf(u, timeZone) === naive);
  if (matches.length > 0) return Math.min(...matches);
  // Nonexistent: binary search (minute precision) for the first instant whose wall-clock time is after `naive`.
  let lo = naive - Math.max(...offsets); // wall clock before the gap
  let hi = naive - Math.min(...offsets); // wall clock after the gap
  while (hi - lo > MINUTE) {
    const mid = lo + Math.floor((hi - lo) / 2 / MINUTE) * MINUTE;
    if (naiveOf(mid, timeZone) > naive) hi = mid;
    else lo = mid;
  }
  return hi;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
const parseDate = (date) => { const [y, m, d] = date.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const formatDate = (naive) => new Date(naive).toISOString().slice(0, 10);
const parseTime = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const formatTime = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

function formatLocal(utcMs, timeZone) {
  const naive = naiveOf(utcMs, timeZone);
  const offsetMin = (naive - utcMs) / MINUTE;
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  return `${new Date(naive).toISOString().slice(0, 19)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// ---------------------------------------------------------------------------------------------------------
// The rules.

/** Wall-clock minutes from the start day's midnight (may exceed 1440) of one window, in order. */
export function windowMinutes(schedule) {
  if (schedule.mode === 'list') {
    // A list is a sequence: an element not later than the previous one belongs to the next day.
    let dayOffset = 0;
    return schedule.start_times.map((t, i) => {
      if (i > 0 && parseTime(t) <= parseTime(schedule.start_times[i - 1])) dayOffset += DAY_MIN;
      return dayOffset + parseTime(t);
    });
  }
  const from = parseTime(schedule.interval_from);
  const to = parseTime(schedule.interval_to) + (parseTime(schedule.interval_to) <= from ? DAY_MIN : 0);
  const minutes = [];
  for (let m = from; m <= to; m += schedule.interval_every_min) minutes.push(m);
  return minutes;
}

/** Bit of a date's weekday in the weekdays mask: Monday = 1 … Sunday = 64. */
const weekdayBit = (naiveDate) => 1 << ((new Date(naiveDate).getUTCDay() + 6) % 7);

/** Expected rounds of the windows that start on from_date … to_date (inclusive, local dates). */
export function expandSchedule(schedule, timeZone, fromDate, toDate) {
  const rounds = [];
  for (let day = parseDate(fromDate); day <= parseDate(toDate); day += DAY_MIN * MINUTE) {
    if (!(schedule.weekdays & weekdayBit(day))) continue;
    const seen = new Set();
    for (const minutes of windowMinutes(schedule)) {
      const utc = resolveLocal(day + minutes * MINUTE, timeZone);
      if (seen.has(utc)) continue; // two wall-clock times shifted onto the same instant (spring gap)
      seen.add(utc);
      rounds.push({
        start_day: formatDate(day),
        wall_time: formatTime(minutes),
        local: formatLocal(utc, timeZone),
        utc: new Date(utc).toISOString(),
      });
    }
  }
  return rounds;
}

/** Default time limit of a new schedule: ceil(walk × 1.5 / 300) × 5 = ceil(walk / 200) × 5, within 5 … 1440; unmeasured: 20. */
export function defaultTimeLimit(walkDurationS) {
  if (walkDurationS === null) return 20;
  return Math.min(DAY_MIN, Math.max(5, Math.ceil(walkDurationS / 200) * 5));
}

// ---------------------------------------------------------------------------------------------------------
// The vectors.

const id = (n) => `019a2b3c-4d5e-7f00-8a00-${String(n).padStart(12, '0')}`;
let nextId = 300;
function schedule(fields) {
  return {
    id: id(nextId++), route_id: id(7), name: fields.name, weekdays: fields.weekdays, mode: fields.mode,
    start_times: fields.start_times ?? null,
    interval_from: fields.interval_from ?? null, interval_to: fields.interval_to ?? null, interval_every_min: fields.interval_every_min ?? null,
    time_limit_min: 20, active: true, created_at: '2026-01-05T08:00:00.000Z', updated_at: '2026-01-05T08:00:00.000Z',
  };
}
const ALL_DAYS = 127, MON_FRI = 31, TUE = 2, FRI = 16, SAT = 32, SUN = 64;
const BUDAPEST = 'Europe/Budapest', NEW_YORK = 'America/New_York', SANTIAGO = 'America/Santiago';

const EXPANSION_CASES = [
  {
    name: 'list-same-day',
    description: 'list mode, every day: one round per start time per day.',
    schedule: schedule({ name: 'Esti', weekdays: ALL_DAYS, mode: 'list', start_times: ['20:00', '22:00'] }),
    timezone: BUDAPEST, from_date: '2026-11-03', to_date: '2026-11-04',
  },
  {
    name: 'list-across-midnight',
    description: 'list mode crossing midnight: 00:00 and 02:00 follow 22:00, so they fall on the next calendar day but belong to the Tuesday window.',
    schedule: schedule({ name: 'Keddi éjszaka', weekdays: TUE, mode: 'list', start_times: ['22:00', '00:00', '02:00', '04:00'] }),
    timezone: BUDAPEST, from_date: '2026-11-02', to_date: '2026-11-08',
  },
  {
    name: 'list-increasing-from-early-morning',
    description: 'list mode whose elements increase: all on the start day, no wrap to the next day.',
    schedule: schedule({ name: 'Nappal', weekdays: TUE, mode: 'list', start_times: ['02:00', '20:00'] }),
    timezone: BUDAPEST, from_date: '2026-11-03', to_date: '2026-11-03',
  },
  {
    name: 'interval-20-08-hourly-13-rounds',
    description: 'interval mode 20:00–08:00 every 60 minutes, both ends included: 13 rounds, crossing midnight.',
    schedule: schedule({ name: 'Éjszaka óránként', weekdays: ALL_DAYS, mode: 'interval', interval_from: '20:00', interval_to: '08:00', interval_every_min: 60 }),
    timezone: BUDAPEST, from_date: '2026-11-03', to_date: '2026-11-03',
  },
  {
    name: 'interval-end-not-on-step',
    description: 'interval mode where the steps do not land on interval_to: the last round is the last step not after it (22:30; 23:20 would be too late).',
    schedule: schedule({ name: 'Este 50 percenként', weekdays: ALL_DAYS, mode: 'interval', interval_from: '20:00', interval_to: '23:00', interval_every_min: 50 }),
    timezone: BUDAPEST, from_date: '2026-11-03', to_date: '2026-11-03',
  },
  {
    name: 'interval-same-day',
    description: 'interval mode within one day: 08:00, 10:00, 12:00.',
    schedule: schedule({ name: 'Délelőtt', weekdays: ALL_DAYS, mode: 'interval', interval_from: '08:00', interval_to: '12:00', interval_every_min: 120 }),
    timezone: BUDAPEST, from_date: '2026-11-03', to_date: '2026-11-03',
  },
  {
    name: 'weekdays-friday-window-includes-saturday-morning',
    description: 'weekdays = Friday; the period is only Friday, yet the Saturday-morning rounds belong to it, because the filter and the day of a round refer to the start day.',
    schedule: schedule({ name: 'Péntek éjjel', weekdays: FRI, mode: 'interval', interval_from: '20:00', interval_to: '08:00', interval_every_min: 240 }),
    timezone: BUDAPEST, from_date: '2026-11-06', to_date: '2026-11-06',
  },
  {
    name: 'weekdays-friday-window-not-in-saturday-period',
    description: 'Same schedule, period only Saturday: no rounds – Saturday-morning rounds belong to Friday.',
    schedule: schedule({ name: 'Péntek éjjel', weekdays: FRI, mode: 'interval', interval_from: '20:00', interval_to: '08:00', interval_every_min: 240 }),
    timezone: BUDAPEST, from_date: '2026-11-07', to_date: '2026-11-07',
  },
  {
    name: 'weekdays-monday-to-friday',
    description: 'weekdays = 31 (Monday–Friday) over a full week: 5 rounds.',
    schedule: schedule({ name: 'Hétköznap', weekdays: MON_FRI, mode: 'list', start_times: ['22:00'] }),
    timezone: BUDAPEST, from_date: '2026-11-02', to_date: '2026-11-08',
  },
  {
    name: 'dst-spring-interval-hourly',
    description: 'Night of 2026-03-28/29 (02:00 CET → 03:00 CEST). Wall-clock steps; 02:00 does not exist and moves to 03:00 CEST, which coincides with the 03:00 step, so it is one round: 12 rounds in 11 real hours.',
    schedule: schedule({ name: 'Éjszaka óránként', weekdays: ALL_DAYS, mode: 'interval', interval_from: '20:00', interval_to: '08:00', interval_every_min: 60 }),
    timezone: BUDAPEST, from_date: '2026-03-28', to_date: '2026-03-28',
  },
  {
    name: 'dst-spring-list-nonexistent-0230',
    description: '02:30 on 2026-03-29 does not exist; it moves to the first valid time after the change, 03:00 CEST (not 03:30).',
    schedule: schedule({ name: 'Vasárnap hajnal', weekdays: SUN, mode: 'list', start_times: ['01:30', '02:30', '03:30'] }),
    timezone: BUDAPEST, from_date: '2026-03-29', to_date: '2026-03-29',
  },
  {
    name: 'dst-spring-every-15-collapse',
    description: '01:45–03:15 every 15 minutes on 2026-03-29: 02:00, 02:15, 02:30, 02:45 and 03:00 all resolve to 03:00 CEST and count once.',
    schedule: schedule({ name: 'Negyedóránként', weekdays: SUN, mode: 'interval', interval_from: '01:45', interval_to: '03:15', interval_every_min: 15 }),
    timezone: BUDAPEST, from_date: '2026-03-29', to_date: '2026-03-29',
  },
  {
    name: 'dst-autumn-interval-hourly',
    description: 'Night of 2026-10-24/25 (03:00 CEST → 02:00 CET). Wall-clock steps; 02:00 occurs twice and the first (CEST) is used: 13 rounds in 13 real hours, 2 real hours between 02:00 and 03:00.',
    schedule: schedule({ name: 'Éjszaka óránként', weekdays: ALL_DAYS, mode: 'interval', interval_from: '20:00', interval_to: '08:00', interval_every_min: 60 }),
    timezone: BUDAPEST, from_date: '2026-10-24', to_date: '2026-10-24',
  },
  {
    name: 'dst-autumn-list-ambiguous-0230',
    description: '02:30 on 2026-10-25 occurs twice; the first occurrence (02:30 CEST = 00:30 UTC) is used.',
    schedule: schedule({ name: 'Vasárnap hajnal', weekdays: SUN, mode: 'list', start_times: ['02:30'] }),
    timezone: BUDAPEST, from_date: '2026-10-25', to_date: '2026-10-25',
  },
  {
    name: 'dst-autumn-every-30',
    description: '01:30–03:30 every 30 minutes on 2026-10-25: 02:00 and 02:30 in CEST, 03:00 and 03:30 in CET; the repeated hour has no rounds of its own.',
    schedule: schedule({ name: 'Félóránként', weekdays: SUN, mode: 'interval', interval_from: '01:30', interval_to: '03:30', interval_every_min: 30 }),
    timezone: BUDAPEST, from_date: '2026-10-25', to_date: '2026-10-25',
  },
  {
    name: 'month-boundary',
    description: 'A window from the last day of a month into the first of the next (2026-10-31 → 11-01); the rounds after midnight belong to October 31.',
    schedule: schedule({ name: 'Éjszaka négyóránként', weekdays: ALL_DAYS, mode: 'interval', interval_from: '20:00', interval_to: '08:00', interval_every_min: 240 }),
    timezone: BUDAPEST, from_date: '2026-10-31', to_date: '2026-10-31',
  },
  {
    name: 'year-boundary',
    description: 'A list window from New Year\'s Eve into 2027-01-01; every round belongs to 2026-12-31.',
    schedule: schedule({ name: 'Szilveszter', weekdays: ALL_DAYS, mode: 'list', start_times: ['22:00', '00:00', '02:00'] }),
    timezone: BUDAPEST, from_date: '2026-12-31', to_date: '2026-12-31',
  },
  {
    name: 'leap-day',
    description: 'Windows of 2028-02-28 and 02-29 (a leap year): into February 29, then into March 1.',
    schedule: schedule({ name: 'Szökőnap', weekdays: ALL_DAYS, mode: 'interval', interval_from: '22:00', interval_to: '02:00', interval_every_min: 120 }),
    timezone: BUDAPEST, from_date: '2028-02-28', to_date: '2028-02-29',
  },
  {
    name: 'sunday-into-monday',
    description: 'weekdays = Sunday over a Monday–Sunday period: the only window starts on the last day and ends on the Monday after the period, and all of it belongs to the period.',
    schedule: schedule({ name: 'Vasárnap éjjel', weekdays: SUN, mode: 'interval', interval_from: '22:00', interval_to: '02:00', interval_every_min: 60 }),
    timezone: BUDAPEST, from_date: '2026-11-02', to_date: '2026-11-08',
  },
  {
    name: 'monthly-period-with-dst-gap',
    description: 'A whole month (March 2026) of a daily 02:30 round: 31 rounds; on 03-29 02:30 does not exist and moves to 03:00 CEST, and from then on the UTC time is an hour earlier.',
    schedule: schedule({ name: 'Hajnali', weekdays: ALL_DAYS, mode: 'list', start_times: ['02:30'] }),
    timezone: BUDAPEST, from_date: '2026-03-01', to_date: '2026-03-31',
  },
  {
    name: 'weekly-period-with-dst-overlap',
    description: 'A week (2026-10-19 … 10-25) of a nightly interval: the window of Saturday 10-24 crosses the autumn change (02:00 is its first, CEST occurrence), the one of Sunday 10-25 is in CET.',
    schedule: schedule({ name: 'Éjszaka háromóránként', weekdays: ALL_DAYS, mode: 'interval', interval_from: '20:00', interval_to: '08:00', interval_every_min: 180 }),
    timezone: BUDAPEST, from_date: '2026-10-19', to_date: '2026-10-25',
  },
  {
    name: 'every-1440',
    description: 'interval_every_min = 1440 (the largest step) in a window of 08:00 → 07:59 the next day: one round a day.',
    schedule: schedule({ name: 'Naponta', weekdays: ALL_DAYS, mode: 'interval', interval_from: '08:00', interval_to: '07:59', interval_every_min: 1440 }),
    timezone: BUDAPEST, from_date: '2026-11-03', to_date: '2026-11-04',
  },
  {
    name: 'new-york-spring-gap',
    description: 'America/New_York, 2026-03-08 (02:00 EST → 03:00 EDT): 02:30 does not exist and moves to 03:00 EDT.',
    schedule: schedule({ name: 'Vasárnap hajnal', weekdays: SUN, mode: 'list', start_times: ['01:30', '02:30', '03:30'] }),
    timezone: NEW_YORK, from_date: '2026-03-08', to_date: '2026-03-08',
  },
  {
    name: 'new-york-autumn-repeat',
    description: 'America/New_York, 2026-11-01 (02:00 EDT → 01:00 EST): 01:30 occurs twice; the first (EDT) is used.',
    schedule: schedule({ name: 'Vasárnap hajnal', weekdays: SUN, mode: 'list', start_times: ['00:30', '01:30', '02:30'] }),
    timezone: NEW_YORK, from_date: '2026-11-01', to_date: '2026-11-01',
  },
  {
    name: 'santiago-spring-midnight-gap',
    description: 'America/Santiago changes at midnight: on 2026-09-06 00:00 -04 → 01:00 -03, so the 00:00 of the Saturday window does not exist, moves to 01:00 -03, and is one round with the 01:00 step.',
    schedule: schedule({ name: 'Szombat éjjel', weekdays: SAT, mode: 'list', start_times: ['23:00', '00:00', '01:00'] }),
    timezone: SANTIAGO, from_date: '2026-09-05', to_date: '2026-09-05',
  },
  {
    name: 'santiago-autumn-repeat-before-midnight',
    description: 'America/Santiago, 2026-04-05 00:00 -03 → 2026-04-04 23:00 -04: the hour before midnight occurs twice, so 23:30 of Saturday 04-04 is its first (-03) occurrence.',
    schedule: schedule({ name: 'Szombat este', weekdays: SAT, mode: 'list', start_times: ['22:30', '23:30'] }),
    timezone: SANTIAGO, from_date: '2026-04-04', to_date: '2026-04-04',
  },
  {
    name: 'utc-timezone',
    description: 'The site\'s time zone is used: in UTC, local and UTC times are equal.',
    schedule: schedule({ name: 'UTC', weekdays: ALL_DAYS, mode: 'interval', interval_from: '22:00', interval_to: '02:00', interval_every_min: 120 }),
    timezone: 'UTC', from_date: '2026-03-28', to_date: '2026-03-28',
  },
];

const TIME_LIMIT_CASES = [null, 0, 1, 200, 201, 600, 601, 840, 3600, 57600, 57601, 86400];

/** The tzdata version recorded in a rendered vector file, or null if it is missing or unreadable. */
export function tzdataOf(content) {
  try {
    const { tzdata } = JSON.parse(content);
    return typeof tzdata === 'string' ? tzdata : null;
  } catch {
    return null;
  }
}

export function buildVectors({ tzdata = process.versions.tz } = {}) {
  return {
    description: 'Waypost schedule test vectors. expansion: every round of the windows that START on from_date … to_date (local dates of the site, inclusive), in time order. time_limit_default: default time_limit_min of a new schedule from the current route version\'s walk_duration_s. tzdata: the IANA time zone database version the rounds were computed with; another version gives the same rounds unless it changed a rule of a case\'s time zone and dates. Rules: docs/decisions.md. Generated by scripts/schedule-vectors.js; do not edit by hand.',
    tzdata,
    rules: [
      'A schedule is interpreted in the site\'s time zone; times are wall-clock times.',
      'interval: from interval_from every interval_every_min minutes up to and including interval_to; if interval_to < interval_from the window crosses midnight. interval_to = interval_from is invalid.',
      'list: the elements form a sequence from the start day; an element not later than the previous one is on the next day. At most one such step, and then the last element must be earlier than the first (the window is shorter than 24 hours).',
      'weekdays (Monday = 1 … Sunday = 64) filters the start day; every round of a window belongs to its start day.',
      'A wall-clock time that occurs twice (autumn) resolves to its first occurrence; one that does not exist (spring) resolves to the first valid time after the change. Rounds of one window resolving to the same instant count once.',
      'Default time limit: walk_duration_s null → 20; otherwise ceil(walk_duration_s / 200) × 5 (= ceil(walk_duration_s × 1.5 / 300) × 5, computed in integers), at least 5 and at most 1440.',
    ],
    expansion: EXPANSION_CASES.map((c) => ({ ...c, expected: expandSchedule(c.schedule, c.timezone, c.from_date, c.to_date) })),
    time_limit_default: TIME_LIMIT_CASES.map((walk) => ({ walk_duration_s: walk, time_limit_min: defaultTimeLimit(walk) })),
  };
}

export function renderVectors(options) {
  return `${JSON.stringify(buildVectors(options), null, 2)}\n`;
}

/** A warning if the file was generated with another tzdata than the running Node's, otherwise null. */
export function tzdataWarning(content) {
  const recorded = tzdataOf(content);
  return recorded !== null && recorded !== process.versions.tz
    ? `schedule/test-vectors.json was generated with tzdata ${recorded}, this Node has ${process.versions.tz}; the rounds still match`
    : null;
}

function main(argv) {
  if (argv.includes('--check')) {
    let current = null;
    try {
      current = readFileSync(VECTORS_FILE, 'utf8');
    } catch {
      // missing file is reported below
    }
    const tzdata = current === null ? undefined : tzdataOf(current) ?? undefined;
    if (current !== renderVectors({ tzdata })) {
      console.error('schedule/test-vectors.json is out of date; run: npm run vectors:schedule');
      return 1;
    }
    const warning = tzdataWarning(current);
    if (warning !== null) console.warn(`warning: ${warning}`);
    console.log('schedule/test-vectors.json is up to date');
    return 0;
  }
  writeFileSync(VECTORS_FILE, renderVectors());
  console.log('wrote schedule/test-vectors.json');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
