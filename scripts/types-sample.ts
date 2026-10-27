// Sample use of the generated types; compiled by scripts/types.test.js (npm test) and npm run typecheck.
// The @ts-expect-error lines must fail to compile: if a type gets looser, tsc reports the unused directive.

import type {
  ChainEntry,
  ChainEntryOf,
  ErrorResponse,
  SchemaTypes,
  ScanPayload,
  SyncPullResponse,
  SyncPushRequest,
} from '../types/index.js';

/** Signature of a schema validator (e.g. Ajv) that narrows to the schema's type. */
declare function isValid<K extends keyof SchemaTypes>(schema: K, data: unknown): data is SchemaTypes[K];

const ids = {
  device: '01928f6e-7c1a-7d3e-8a4b-1c2d3e4f5a6b',
  entry: '01928f6e-7c1a-7d3e-8a4b-1c2d3e4f5a01',
  shift: '01928f6e-7c1a-7d3e-8a4b-1c2d3e4f5a02',
  scan: '01928f6e-7c1a-7d3e-8a4b-1c2d3e4f5a03',
};
const zeros = '0'.repeat(64);

const fields = {
  id: ids.entry,
  device_id: ids.device,
  seq: 1,
  device_time: '2026-10-27T20:00:00.000Z',
  uptime_ms: 123_456,
  boot_id: 'boot-1',
  gnss_time: null,
  ref_server_time: null,
  ref_uptime_ms: null,
  ref_boot_id: null,
  prev_hash: zeros,
  hash: zeros,
};

const scanPayload: ScanPayload = {
  scan_id: ids.scan,
  round_id: null,
  checkpoint_id: null,
  method: 'qr',
  tag_uid: null,
  qr_payload: 'waypost:cp:01928f6e-7c1a-7d3e-8a4b-1c2d3e4f5a6b:AbCdEfGh12345678',
  ndef_raw: null,
  lat_e7: 474_979_000,
  lng_e7: 190_402_000,
  accuracy_dm: 125,
  is_mock: false,
  flags: ['out_of_round', 'unknown_tag'],
  note: null,
  media: [],
};

const scan: ChainEntryOf<'scan'> = { ...fields, type: 'scan', payload: scanPayload };
const shiftStarted: ChainEntry = {
  ...fields,
  type: 'shift_started',
  payload: { shift_id: ids.shift, guard_id: ids.shift, site_id: ids.shift },
};

// Narrowing on type narrows the payload; the switch is exhaustive.
export function describe(entry: ChainEntry): string {
  switch (entry.type) {
    case 'shift_started':
      return `shift ${entry.payload.shift_id} by ${entry.payload.guard_id}`;
    case 'shift_closed':
      return `shift ${entry.payload.shift_id} closed by ${entry.payload.closed_by}`;
    case 'round_opened':
      return `round ${entry.payload.round_id} due ${entry.payload.scheduled_at}`;
    case 'scan':
      return `${entry.payload.method} scan, flags: ${entry.payload.flags.join(',')}`;
    case 'incident':
      return `incident: ${entry.payload.category}`;
    case 'round_closed':
      return `round ${entry.payload.round_id}: ${entry.payload.status}`;
    default: {
      const unreachable: never = entry;
      return unreachable;
    }
  }
}

export const push: SyncPushRequest = { device_id: ids.device, entries: [shiftStarted, scan] };

export function firstDetail(response: ErrorResponse): string | undefined {
  const details = response.error.details;
  if (details === undefined) return undefined;
  const [field] = Object.keys(details);
  // noUncheckedIndexedAccess: an index signature lookup may be undefined; the list itself is non-empty.
  return field === undefined ? undefined : details[field]?.[0];
}

export function siteNames(body: unknown): string[] {
  if (!isValid('api/sync-pull.response', body)) return [];
  const pull: SyncPullResponse = body;
  return pull.changes.sites.map((site) => `${site.name} (${site.timezone})`);
}

// --- what the types reject -------------------------------------------------------------------------------

// @ts-expect-error a scan entry with a shift_started payload
export const wrongPayload: ChainEntry = { ...fields, type: 'scan', payload: shiftStarted.payload };

// @ts-expect-error an unknown entry type
export const unknownType: ChainEntry = { ...fields, type: 'sos', payload: scanPayload };

const { gnss_time: _omitted, ...withoutGnssTime } = fields;
// @ts-expect-error a null-valued field must still be present
export const missingNull: ChainEntryOf<'scan'> = { ...withoutGnssTime, type: 'scan', payload: scanPayload };

// @ts-expect-error a push needs at least one entry
export const emptyPush: SyncPushRequest = { device_id: ids.device, entries: [] };

// @ts-expect-error an enum value outside the schema
export const wrongMethod: ScanPayload = { ...scanPayload, method: 'bluetooth' };

// @ts-expect-error a property the schema does not have (additionalProperties: false)
export const extraProperty: ScanPayload = { ...scanPayload, accuracy_m: 12 };

export function noDetails(response: ErrorResponse): void {
  // @ts-expect-error details is optional
  response.error.details.foo;
}
