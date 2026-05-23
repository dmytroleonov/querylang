import { type ILexingResult, Lexer, type TokenType } from 'chevrotain';
import {
  And,
  AnyValue,
  Colon,
  Eq,
  Keyword,
  LParen,
  Not,
  Null,
  Or,
  QuotedValue,
  Range,
  RParen,
  Tilde,
  Value,
  Whitespace,
} from '@/keywords/builtin.js';
import type { CreatedKeywords } from '@/keywords/createKeywords.js';
import type { CreateKeywordInput } from '@/keywords/types.js';

export type CustomLexer = {
  lex: (input: string) => ILexingResult;
};

// Tokens should be soreted in a reverse alphabetical order
// in order for chevrotain to correctly tokenize the input
export function sortTokens(tokens: TokenType[]): TokenType[] {
  return tokens.toSorted((a, b) => b.name.localeCompare(a.name));
}

const sortableBuiltinTokens: TokenType[] = [Null];

export function insertBuiltinTokens(tokens: TokenType[]): void {
  for (const builtinToken of sortableBuiltinTokens) {
    let inserted = false;
    for (const [i, t] of tokens.entries()) {
      if (builtinToken.name.localeCompare(t.name) > 0) {
        tokens.splice(i, 0, builtinToken);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      tokens.unshift(builtinToken);
    }
  }
}

export function createLexer<TKeywords extends CreateKeywordInput>(
  keywords: CreatedKeywords<TKeywords>,
): CustomLexer {
  const userDefinedTokens = Object.values(keywords).map((k) => k.tokenType);
  const sortedTokens = sortTokens(userDefinedTokens);
  insertBuiltinTokens(sortedTokens);
  const allTokens: TokenType[] = [
    Whitespace,
    Colon,
    Not,
    Or,
    And,
    LParen,
    RParen,
    Range,
    Eq,
    Tilde,
    ...sortedTokens,
    Value,
    QuotedValue,
    AnyValue,
    Keyword,
  ];

  const chevrotainLexer = new Lexer(allTokens, {
    recoveryEnabled: false,
    deferDefinitionErrorsHandling: false,
    ensureOptimizations: true,
    // todo
    // errorMessageProvider,
    positionTracking: 'full',
    safeMode: false,
    skipValidations: false,
    traceInitPerf: false,
  });

  return {
    lex: (input) => {
      return chevrotainLexer.tokenize(input);
    },
  };
}
