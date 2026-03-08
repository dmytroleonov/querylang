import { createToken, Lexer, type TokenType } from 'chevrotain';
import { SearchQlError } from '@/errors/searchQlError.js';

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

type Prettify<T> = { [K in keyof T]: T[K] } & unknown;
export type DataType = 'string' | 'number' | 'boolean';
export type KeywordTypeFactory<
  TDataType extends DataType,
  TConfig extends Record<string, unknown> | undefined = undefined,
> = Prettify<
  {
    type: TDataType;
    alias?: string[];
  } & (undefined extends TConfig ? { config?: TConfig } : { config: TConfig })
>;
export type StringKeywordConfig = undefined;
export type StringKeywordType = KeywordTypeFactory<
  'string',
  StringKeywordConfig
>;
export type NumberKeywordConfig = {
  min?: number;
  max?: number;
};
export type NumberKeywordType = KeywordTypeFactory<
  'number',
  NumberKeywordConfig | undefined
>;
export type BooleanKeywordConfig = undefined;
export type BooleanKeywordType = KeywordTypeFactory<
  'boolean',
  BooleanKeywordConfig
>;
export type AnyKeyword =
  | StringKeywordType
  | NumberKeywordType
  | BooleanKeywordType;

export const reservedKeywords = ['true', 'false', 'not', 'or', 'and'];

const keywordLiteralPattern = /^[_A-Za-z][_A-Za-z0-9]*$/;

export function validateKeyword(keywordLiteral: string): void {
  if (reservedKeywords.includes(keywordLiteral)) {
    throw new SearchQlError(
      `'${keywordLiteral}' is a reserved keyword and cannot be used as an identifier`,
    );
  }
  if (!keywordLiteralPattern.test(keywordLiteral)) {
    throw new SearchQlError(
      `'${keywordLiteral}' is not a valid keyword. Keyword litrals should match the following pattern: '${keywordLiteralPattern}'`,
    );
  }
}

export type CreateKeywordInput = Record<string, AnyKeyword>;
export type CreatedKeywords<TKeywords extends CreateKeywordInput> = Prettify<{
  [K in keyof TKeywords]: {
    config: TKeywords[K];
    tokenType: TokenType;
  };
}>;

export function createKeywordToken(
  keywordLiteral: string,
  alias: string[] = [],
): TokenType {
  const patternString = [keywordLiteral, ...alias].join('\\|');
  const pattern = new RegExp(patternString);

  return createToken({
    name: keywordLiteral,
    pattern,
  });
}

export function createKeywords<TKeywords extends CreateKeywordInput>(
  keywords: TKeywords,
): CreatedKeywords<TKeywords> {
  const createdKeywords = {} as CreatedKeywords<TKeywords>;
  const aliasMap = new Map<string, string>();
  const keywordSet = new Set<string>();

  for (const keywordLiteral in keywords) {
    keywordSet.add(keywordLiteral);
    validateKeyword(keywordLiteral);
    const config = keywords[keywordLiteral];

    for (const alias of config?.alias ?? []) {
      validateKeyword(alias);
      if (aliasMap.has(alias)) {
        const existingKeywordLiteral = aliasMap.get(alias);
        throw new SearchQlError(
          `duplicate alias '${alias}' found both in '${existingKeywordLiteral}' and '${keywordLiteral}`,
        );
      }
      aliasMap.set(alias, keywordLiteral);
    }

    for (const [alias, keywordLiteral] of aliasMap.entries()) {
      if (keywordSet.has(alias)) {
        throw new SearchQlError(
          `alias '${alias}' of keyword '${keywordLiteral}' duplicates keyword '${alias}'`,
        );
      }
    }

    const tokenType = createKeywordToken(
      keywordLiteral,
      keywords[keywordLiteral]?.alias,
    );
    createdKeywords[keywordLiteral] = { config, tokenType };
  }

  return createdKeywords;
}
