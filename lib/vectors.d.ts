// @waypost/schema/vectors: the shared test vectors of the chain hash and the schedule expansion, for tests.

import type { Base64, Hash, LocalTime, Schedule, Timestamp, UnsignedChainEntry } from '../types/index.js';

/** An entry and its expected canonical JSON and HMAC. */
export interface ChainVector {
  input: UnsignedChainEntry;
  /** RFC 8785 canonical JSON of input. */
  canonical_json: string;
  /** Lowercase hex HMAC-SHA256 of canonical_json (UTF-8) with the vector key. */
  hash: Hash;
}

export interface ChainVectorCase extends ChainVector {
  name: string;
  description: string;
}

/** chain/test-vectors.json */
export interface ChainVectors {
  description: string;
  /** The 32-byte HMAC key of every vector. */
  key_base64: Base64;
  key_hex: string;
  cases: ChainVectorCase[];
  /** Entries seq 1, 2, 3 of one device, each linked to the previous through prev_hash. */
  chain: { description: string; entries: ChainVector[] };
}

/** One expected round. */
export interface ScheduleRound {
  /** Local date (YYYY-MM-DD) the round's window starts on: the day the round belongs to. */
  start_day: string;
  /** The wall-clock time of the schedule the round comes from. */
  wall_time: LocalTime;
  /** The actual local time with its UTC offset, e.g. 2026-03-29T03:00:00+02:00. */
  local: string;
  utc: Timestamp;
}

export interface ScheduleExpansionCase {
  name: string;
  description: string;
  schedule: Schedule;
  /** IANA time zone of the site. */
  timezone: string;
  /** First and last local start day (YYYY-MM-DD), both included. */
  from_date: string;
  to_date: string;
  /** Every round of the period, in time order. */
  expected: ScheduleRound[];
}

export interface TimeLimitDefaultCase {
  walk_duration_s: number | null;
  time_limit_min: number;
}

/** schedule/test-vectors.json */
export interface ScheduleVectors {
  description: string;
  rules: string[];
  expansion: ScheduleExpansionCase[];
  time_limit_default: TimeLimitDefaultCase[];
}

export declare const chainVectors: ChainVectors;
export declare const scheduleVectors: ScheduleVectors;
