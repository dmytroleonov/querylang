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
export const UnquotedString = createToken({
  name: 'UnquotedString',
  pattern: /(?:\\\\|\\[\s!&|():=~'"\\]|[^\s!&|():=~'"\\])+/,
});
export const QuotedString = createToken({
  name: 'QuotedString',
  pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/,
});
export const Null = createToken({
  name: 'Null',
  pattern: /null/,
  longer_alt: UnquotedString,
});
export const Not = createToken({
  name: 'Not',
  pattern: /!/,
  longer_alt: UnquotedString,
});
export const Or = createToken({
  name: 'Or',
  pattern: /\|/,
  longer_alt: UnquotedString,
});
export const And = createToken({
  name: 'And',
  pattern: /&/,
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
