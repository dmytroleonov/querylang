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
export const UnquotedString = createToken({
  name: 'unquotedString',
  pattern: /^(?!.*\.\.)(?:\\\\|\\[\s!&|():=~'"\\.]|[^\s!&|():=~'"\\])+/,
});
export const QuotedString = createToken({
  name: 'quotedString',
  pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/,
});
export const Range = createToken({
  name: 'range',
  pattern: /../,
});
export const Null = createToken({
  name: 'null',
  pattern: /null/,
  longer_alt: UnquotedString,
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
