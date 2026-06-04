import { createToken, type ITokenConfig, type TokenType } from 'chevrotain';
import { Keyword, Value } from '@/builtin.js';
import { QueryLangError } from '@/erorr.js';
import { getDefaultTransform } from '@/transformer.js';
import type { AnyKeyword, CreateKeywordInput, TransformFn } from '@/types.js';

export const reservedKeywords = ['null'];

const keywordLiteralPattern = /^[_A-Za-z][_A-Za-z0-9]*$/;

export function validateKeyword(keywordLiteral: string): void {
  if (reservedKeywords.includes(keywordLiteral)) {
    throw new QueryLangError(
      `'${keywordLiteral}' is a reserved keyword and cannot be used as an identifier`,
    );
  }
  if (!keywordLiteralPattern.test(keywordLiteral)) {
    throw new QueryLangError(
      `'${keywordLiteral}' is not a valid keyword. Keyword litrals should match the following pattern: '${keywordLiteralPattern}'`,
    );
  }
}

export type NormalizeConfig<T extends AnyKeyword> = Pick<T, 'type'> & {
  transform: TransformFn<T['type']>;
};
export type CreatedKeyword<
  TKeyword extends AnyKeyword,
  TOriginalKeyword extends string,
> = {
  config: NormalizeConfig<TKeyword>;
  tokenType: TokenType;
  originalKeyword: TOriginalKeyword;
};
export type CreatedKeywords<TKeywords extends CreateKeywordInput> = {
  [K in keyof TKeywords]: CreatedKeyword<TKeywords[K], Extract<K, string>>;
} & {
  [K in keyof TKeywords as keyof TKeywords[K]['aliases']]: CreatedKeyword<
    TKeywords[K],
    Extract<K, string>
  >;
};

export type CreateKeywordTokenConfig = Omit<ITokenConfig, 'name' | 'pattern'>;

export function createKeywordToken(
  keywordLiteral: string,
  { categories: _categories, ...rest }: CreateKeywordTokenConfig = {},
): TokenType {
  const pattern = new RegExp(keywordLiteral);
  const categories: TokenType[] = [Keyword];
  if (_categories) {
    if (Array.isArray(_categories)) {
      categories.push(..._categories);
    } else {
      categories.push(_categories);
    }
  }

  return createToken({
    name: keywordLiteral,
    pattern,
    categories,
    longer_alt: Value,
    ...rest,
  });
}

type ExtractAliases<T extends AnyKeyword> = Extract<keyof T['aliases'], string>;

export function normalizeConfig<TKeyword extends AnyKeyword>(
  config: TKeyword,
): NormalizeConfig<TKeyword> {
  const defaultTransform = getDefaultTransform(config.type);
  const normalizedConfig: NormalizeConfig<TKeyword> = {
    type: config.type,
    transform: config.transform ?? defaultTransform,
  };

  return normalizedConfig;
}

export function createKeywordTokens<
  TName extends string,
  TConfig extends AnyKeyword,
>(name: TName, config: TConfig): CreatedKeywords<Record<TName, TConfig>> {
  const keywords = {} as CreatedKeywords<Record<TName, TConfig>>;
  const mainToken = createKeywordToken(name);
  const normalizedConfig = normalizeConfig(config);

  keywords[name] = {
    config: normalizedConfig,
    tokenType: mainToken,
    originalKeyword: name,
    // biome-ignore lint/suspicious/noExplicitAny: is this possible to type?
  } as any;

  for (const alias of Object.keys(
    config.aliases ?? {},
  ) as ExtractAliases<TConfig>[]) {
    const aliasToken = createKeywordToken(alias, { categories: mainToken });
    keywords[alias] = {
      config: normalizedConfig,
      tokenType: aliasToken,
      originalKeyword: name,
      // biome-ignore lint/suspicious/noExplicitAny: is this possible to type?
    } as any;
  }

  return keywords;
}

// todo: throw on empty keywords object or when no string keywords are provided
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

    for (const alias in config?.aliases ?? {}) {
      validateKeyword(alias);
      if (aliasMap.has(alias)) {
        const existingKeywordLiteral = aliasMap.get(alias);
        throw new QueryLangError(
          `duplicate alias '${alias}' found both in '${existingKeywordLiteral}' and '${keywordLiteral}`,
        );
      }
      aliasMap.set(alias, keywordLiteral);
    }

    for (const [alias, keywordLiteral] of aliasMap.entries()) {
      if (keywordSet.has(alias)) {
        throw new QueryLangError(
          `alias '${alias}' of keyword '${keywordLiteral}' duplicates keyword '${alias}'`,
        );
      }
    }

    const tokens = createKeywordTokens(
      keywordLiteral,
      keywords[keywordLiteral as keyof TKeywords],
    );

    for (const token in tokens) {
      createdKeywords[token as keyof CreatedKeywords<TKeywords>] = tokens[
        token
      ] as CreatedKeywords<TKeywords>[keyof CreatedKeywords<TKeywords>];
    }
  }

  return createdKeywords;
}
