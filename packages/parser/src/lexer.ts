import { type ILexingResult, Lexer, type TokenType } from 'chevrotain';
import {
  And,
  AnyValue,
  Colon,
  Eq,
  Gt,
  Gte,
  Keyword,
  LParen,
  Lt,
  Lte,
  Not,
  Null,
  NumberValue,
  Or,
  QuotedValue,
  Range,
  RParen,
  Tilde,
  Value,
  Whitespace,
} from '@/builtin.js';
import { type CreatedKeywords, createKeywords } from '@/createKeywords.js';
import type { CreateKeywordInput } from '@/types.js';

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

export type Language<TKeywords extends CreateKeywordInput> = {
  keywords: CreatedKeywords<TKeywords>;
  tokens: TokenType[];
};

export function createLanguage<TKeywords extends CreateKeywordInput>(
  keywords: TKeywords,
): Language<TKeywords> {
  const createdKeywords = createKeywords(keywords);
  const keywordTokens = Object.values(createdKeywords).map((k) => k.tokenType);
  const sortedTokens = sortTokens(keywordTokens);
  insertBuiltinTokens(sortedTokens);

  return {
    keywords: createdKeywords,
    tokens: [
      Whitespace,
      Colon,
      Not,
      Or,
      And,
      LParen,
      RParen,
      Range,
      Gte,
      Gt,
      Lte,
      Lt,
      Eq,
      Tilde,
      ...sortedTokens,
      NumberValue,
      Value,
      QuotedValue,
      AnyValue,
      Keyword,
    ],
  };
}

export function createLexer(tokens: TokenType[]): CustomLexer {
  const chevrotainLexer = new Lexer(tokens, {
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
