import { describe, expect, it } from 'vitest';
import { escapeString } from '@/utils.js';

describe(escapeString, () => {
  it('returns unquoted strings without escapes as is', () => {
    expect(escapeString('value')).toEqual('value');
  });

  it('removes quotes from strings', () => {
    expect(escapeString('"value"')).toEqual('value');
    expect(escapeString("'value'")).toEqual('value');
  });

  it('escapes special sequences', () => {
    expect(escapeString('\\\\')).toEqual('\\');
    expect(escapeString('\\n')).toEqual('\n');
    expect(escapeString('\\r')).toEqual('\r');
    expect(escapeString('\\b')).toEqual('\b');
    expect(escapeString('\\f')).toEqual('\f');
    expect(escapeString('\\t')).toEqual('\t');
    expect(escapeString('"\\\\"')).toEqual('\\');
    expect(escapeString('"\\n"')).toEqual('\n');
    expect(escapeString('"\\r"')).toEqual('\r');
    expect(escapeString('"\\b"')).toEqual('\b');
    expect(escapeString('"\\f"')).toEqual('\f');
    expect(escapeString('"\\t"')).toEqual('\t');
  });

  it('removes "\\" if it is not a special escape sequence', () => {
    expect(escapeString('\\a')).toEqual('a');
    expect(escapeString('"\\a"')).toEqual('a');
  });

  it('handles empty strings', () => {
    expect(escapeString('""')).toEqual('');
    expect(escapeString("''")).toEqual('');
  });
});
