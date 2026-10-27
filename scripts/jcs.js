// RFC 8785 JSON Canonicalization Scheme (JCS), restricted to what Waypost allows in hashed data:
// numbers must be integers within ±(2^53 − 1), so no floating-point formatting is ever needed.
//
// - object keys sorted by UTF-16 code units (JS default sort), no whitespace;
// - strings serialized like ECMAScript JSON.stringify (only ", \, and U+0000–U+001F are escaped;
//   \b \t \n \f \r short forms, otherwise \u00xx lowercase; '/', non-ASCII and U+2028/U+2029 are literal);
// - strings must be well-formed UTF-16 (no lone surrogates), as I-JSON requires.

export class CanonicalJsonError extends Error {}

function fail(path, message) {
  throw new CanonicalJsonError(`${path || '/'}: ${message}`);
}

function serialize(value, path) {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isInteger(value)) fail(path, `floating-point number not allowed: ${value}`);
      if (!Number.isSafeInteger(value)) fail(path, `integer outside ±(2^53 − 1): ${value}`);
      return Object.is(value, -0) ? '0' : String(value);
    case 'string':
      if (!value.isWellFormed()) fail(path, 'string contains a lone surrogate');
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value.map((item, i) => serialize(item, `${path}/${i}`)).join(',')}]`;
      }
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) fail(path, 'only plain objects are allowed');
      const members = Object.keys(value)
        .sort()
        .map((key) => {
          if (!key.isWellFormed()) fail(path, 'key contains a lone surrogate');
          if (value[key] === undefined) fail(`${path}/${key}`, 'undefined is not a JSON value');
          return `${JSON.stringify(key)}:${serialize(value[key], `${path}/${key}`)}`;
        });
      return `{${members.join(',')}}`;
    }
    default:
      return fail(path, `${typeof value} is not a JSON value`);
  }
}

/** Returns the canonical JSON text of value; throws CanonicalJsonError for anything not allowed. */
export function canonicalJson(value) {
  return serialize(value, '');
}
