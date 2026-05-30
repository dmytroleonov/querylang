import { createToken, Lexer } from 'chevrotain';

export const Whitespace = createToken({
  name: 'whitespace',
  pattern: /[ \t\n\r]+/,
  group: Lexer.SKIPPED,
});
export const Colon = createToken({
  name: 'colon',
  pattern: /:/,
});

export const AnyValue = createToken({
  name: 'anyValue',
  pattern: Lexer.NA,
});

export const NumberValue = createToken({
  name: 'number',
  pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/,
  categories: AnyValue,
});

// matches any character escaped and doesnt' allow the following without escaping:
// \s regex
// !, &, |, (, ), :, =, ~, ', ", ., >, <
export const Value = createToken({
  name: 'value',
  pattern:
    // biome-ignore lint/suspicious/noControlCharactersInRegex: chevrotain workaround
    /(?:\\.|[\u0000-\u0008\u000e-\u001f\u0023-\u0025\u002a-\u002d\u002f-\u0039\u003b\u003f\u003e-\u007b\u007d\u007f-\u009f\u00a1-\u167f\u1681-\u1fff\u200b-\u2027\u202a-\u202e\u2030-\u205e\u2026-\u2fff\u3001-\ufefe\uff00-\uffff])+/,
  categories: AnyValue,
});
export const QuotedValue = createToken({
  name: 'quotedValue',
  pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/,
  categories: AnyValue,
});
export const Range = createToken({
  name: 'range',
  pattern: /\.\./,
});
export const Null = createToken({
  name: 'null',
  pattern: /null/,
  longer_alt: Value,
  categories: AnyValue,
});
export const Not = createToken({
  name: 'not',
  pattern: /!/,
});
export const Or = createToken({
  name: 'or',
  pattern: /\|/,
});
export const And = createToken({
  name: 'and',
  pattern: /&/,
});
export const LParen = createToken({
  name: 'lParen',
  pattern: /\(/,
});
export const RParen = createToken({
  name: 'rParen',
  pattern: /\)/,
});
export const Keyword = createToken({
  name: 'keyword',
  pattern: Lexer.NA,
});
export const Eq = createToken({
  name: 'eq',
  pattern: /=/,
});
export const Tilde = createToken({
  name: 'tilde',
  pattern: /~/,
});
export const Gte = createToken({
  name: 'gte',
  pattern: />=/,
});
export const Gt = createToken({
  name: 'gt',
  pattern: />/,
});
export const Lte = createToken({
  name: 'lte',
  pattern: /<=/,
});
export const Lt = createToken({
  name: 'lt',
  pattern: /</,
});
