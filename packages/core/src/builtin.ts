import { createToken, Lexer } from 'chevrotain';

export const Whitespace = createToken({
  name: 'whitespace',
  label: "' '",
  pattern: /[ \t\n\r]+/,
});
export const Colon = createToken({
  name: 'colon',
  label: ':',
  pattern: /:/,
});

export const AnyValue = createToken({
  name: 'anyValue',
  label: 'value',
  pattern: Lexer.NA,
});

export const NumberValue = createToken({
  name: 'number',
  label: 'number',
  pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/,
  categories: AnyValue,
});

export const BooleanValue = createToken({
  name: 'boolean',
  label: 'boolean',
  pattern: Lexer.NA,
});

export const StringValue = createToken({
  name: 'string',
  label: 'string',
  pattern: Lexer.NA,
});

// matches any character escaped and doesnt' allow the following without escaping:
// \s regex
// !, &, |, (, ), :, =, ~, ', ", ., >, <
// \ at the end of the input
export const Value = createToken({
  name: 'value',
  label: 'unquoted string',
  pattern:
    // biome-ignore lint/suspicious/noControlCharactersInRegex: chevrotain workaround
    /(?:\\.|[\u0000-\u0008\u000e-\u001f\u0023-\u0025\u002a-\u002d\u002f-\u0039\u003b\u003f-\u005b\u005d-\u007b\u007d\u007f-\u009f\u00a1-\u167f\u1681-\u1fff\u200b-\u2027\u202a-\u202e\u2030-\u205e\u2026-\u2fff\u3001-\ufefe\uff00-\uffff])+/,
  categories: [AnyValue, StringValue],
});
export const QuotedValue = createToken({
  name: 'quotedValue',
  label: 'quoted string',
  pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/,
  categories: [AnyValue, StringValue],
});
export const False = createToken({
  name: 'false',
  label: 'false',
  pattern: /false/,
  longer_alt: Value,
  categories: [BooleanValue, AnyValue],
});
export const True = createToken({
  name: 'true',
  label: 'true',
  pattern: /true/,
  longer_alt: Value,
  categories: [BooleanValue, AnyValue],
});
export const Range = createToken({
  name: 'range',
  label: '..',
  pattern: /\.\./,
});
export const Null = createToken({
  name: 'null',
  label: 'null',
  pattern: /null/,
  longer_alt: Value,
  categories: AnyValue,
});
export const Not = createToken({
  name: 'not',
  label: '!',
  pattern: /!/,
});
export const Or = createToken({
  name: 'or',
  label: '|',
  pattern: /\|/,
});
export const And = createToken({
  name: 'and',
  label: '&',
  pattern: /&/,
});
export const LParen = createToken({
  name: 'lParen',
  label: '(',
  pattern: /\(/,
});
export const RParen = createToken({
  name: 'rParen',
  label: ')',
  pattern: /\)/,
});
export const Keyword = createToken({
  name: 'keyword',
  pattern: Lexer.NA,
});
export const Eq = createToken({
  name: 'eq',
  label: '=',
  pattern: /=/,
});
export const Tilde = createToken({
  name: 'tilde',
  label: '~',
  pattern: /~/,
});
export const Gte = createToken({
  name: 'gte',
  label: '>=',
  pattern: />=/,
});
export const Gt = createToken({
  name: 'gt',
  label: '>',
  pattern: />/,
});
export const Lte = createToken({
  name: 'lte',
  label: '<=',
  pattern: /<=/,
});
export const Lt = createToken({
  name: 'lt',
  label: '<',
  pattern: /</,
});
