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
  pattern: /^(?!.*\.\.)(?:\\\\|\\[\s!&|():=~'"\\.]|[^\s!&|():=~'"\\])+/,
});
export const QuotedString = createToken({
  name: 'QuotedString',
  pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/,
});
export const Range = createToken({
  name: 'Range',
  pattern: /../,
});
export const Null = createToken({
  name: 'Null',
  pattern: /null/,
  longer_alt: UnquotedString,
});
export const Not = createToken({
  name: 'Not',
  pattern: /!/,
});
export const Or = createToken({
  name: 'Or',
  pattern: /\|/,
});
export const And = createToken({
  name: 'And',
  pattern: /&/,
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
