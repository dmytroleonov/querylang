import {
  type ILexingError,
  type IToken,
  Lexer,
  type TokenType,
} from 'chevrotain';
import {
  And,
  AnyValue,
  Colon,
  Eq,
  False,
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
  StringValue,
  Tilde,
  True,
  Value,
  Whitespace,
} from '@/builtin.js';
import { type CreatedKeywords, createKeywords } from '@/createKeywords.js';
import type { CreateKeywordInput, QueryLangError } from '@/types.js';

export type LexingResult = {
  errors: QueryLangError[];
  tokens: IToken[];
};

export type ChevrotainLexer = {
  tokenize: (input: string) => LexingResult;
};

// Tokens should be soreted in a reverse alphabetical order
// in order for chevrotain to correctly tokenize the input
export function sortTokens(tokens: TokenType[]): TokenType[] {
  return tokens.toSorted((a, b) => b.name.localeCompare(a.name));
}

const sortableBuiltinTokens: TokenType[] = [False, True, Null];

export type Language<TKeywords extends CreateKeywordInput> = {
  keywords: CreatedKeywords<TKeywords>;
  tokens: TokenType[];
};

export function createLanguage<TKeywords extends CreateKeywordInput>(
  keywords: TKeywords,
): Language<TKeywords> {
  const createdKeywords = createKeywords(keywords);
  const keywordTokens = Object.values(createdKeywords).map((k) => k.tokenType);
  const tokens = sortTokens([...keywordTokens, ...sortableBuiltinTokens]);

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
      ...tokens,
      NumberValue,
      Value,
      QuotedValue,
      StringValue,
      AnyValue,
      Keyword,
    ],
  };
}

function lexingErrorToQueryLangError(error: ILexingError): QueryLangError {
  return {
    message: error.message,
    startOffset: error.offset,
    startLine: error.line!,
    startColumn: error.column!,
    endOffset: error.offset! + error.length,
    endLine: error.line!,
    endColumn: error.column!,
  };
}

function buildUnexpectedCharactersMessage(
  fullText: string,
  startOffset: number,
  length: number,
): string {
  const ch = fullText.slice(startOffset, startOffset + length + 1);
  return `unexpected character ->${ch}<-`;
}

export function createChevrotainLexer(tokens: TokenType[]): ChevrotainLexer {
  const chevrotainLexer = new Lexer(tokens, {
    recoveryEnabled: false,
    deferDefinitionErrorsHandling: false,
    ensureOptimizations: true,
    errorMessageProvider: {
      buildUnexpectedCharactersMessage,
      // won't ever be used since we have only one mode
      buildUnableToPopLexerModeMessage: () => '',
    },
    positionTracking: 'full',
    safeMode: false,
    skipValidations: false,
    traceInitPerf: false,
  });

  return {
    tokenize: (input) => {
      const { errors, tokens } = chevrotainLexer.tokenize(input);
      const queryLangErrors = errors.map(lexingErrorToQueryLangError);

      return {
        errors: queryLangErrors,
        tokens,
      };
    },
  };
}
