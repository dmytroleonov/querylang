import { createToken, Lexer } from 'chevrotain';

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /[ \t\n\r]+/,
  group: Lexer.SKIPPED,
});
export const Colon = createToken({
  name: 'Colon',
  pattern: /:/,
});
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/,
});
export const UnquotedString = createToken({
  name: 'UnquotedString',
  pattern: /(?:\\.|[^\s():~='"-])(?:\\.|[^\s():~='"])*/,
});
export const QuotedString = createToken({
  name: 'QuotedString',
  pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/,
});
export const True = createToken({
  name: 'True',
  pattern: /true/,
  longer_alt: UnquotedString,
});
export const False = createToken({
  name: 'False',
  pattern: /false/,
  longer_alt: UnquotedString,
});
export const Null = createToken({
  name: 'Null',
  pattern: /null/,
  longer_alt: UnquotedString,
});
export const Not = createToken({
  name: 'Not',
  pattern: /not/,
  longer_alt: UnquotedString,
});
export const Or = createToken({
  name: 'Or',
  pattern: /or/,
  longer_alt: UnquotedString,
});
export const And = createToken({
  name: 'And',
  pattern: /and/,
  longer_alt: UnquotedString,
});
export const LParen = createToken({
  name: 'LParen',
  pattern: /\(/,
});
export const RParen = createToken({
  name: 'RParen',
  pattern: /\)/,
});
export const Keyword = createToken({
  name: 'Keyword',
  pattern: Lexer.NA,
});
