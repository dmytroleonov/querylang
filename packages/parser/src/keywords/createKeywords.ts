import { createToken, type ITokenConfig, type TokenType } from 'chevrotain';
import { SearchQlError } from '@/errors/searchQlError.js';
import { Keyword } from '@/keywords/builtin.js';

type Prettify<T> = { [K in keyof T]: T[K] } & unknown;
export type DataType = 'string' | 'number' | 'boolean';
export type Aliases = Record<string, true>;
export type KeywordTypeFactory<
  TDataType extends DataType,
  TConfig extends Record<string, unknown> | undefined = undefined,
> = Prettify<
  {
    type: TDataType;
    aliases?: Aliases;
  } & (undefined extends TConfig
    ? { validator?: TConfig }
    : { validator: TConfig })
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

export const reservedKeywords = ['true', 'false', 'not', 'or', 'and', 'null'];

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

export type SimplifyConfig<T extends AnyKeyword> = Pick<
  T,
  'type' | 'validator'
>;
export type CreateKeywordInput = Record<string, AnyKeyword>;
export type CreatedKeyword<T extends AnyKeyword> = {
  config: SimplifyConfig<T>;
  tokenType: TokenType;
};
export type CreatedKeywords<TKeywords extends CreateKeywordInput> = {
  [K in keyof TKeywords]: CreatedKeyword<TKeywords[K]>;
} & {
  [K in keyof TKeywords as keyof TKeywords[K]['aliases']]: CreatedKeyword<
    TKeywords[K]
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
    ...rest,
  });
}

type ExtractAliases<T extends AnyKeyword> = Extract<keyof T['aliases'], string>;

function simplifyConfig<TKeyword extends AnyKeyword>(
  config: TKeyword,
): SimplifyConfig<TKeyword> {
  const simplifiedConfig: SimplifyConfig<TKeyword> = {
    type: config.type,
  };
  if (Object.hasOwn(config, 'validator')) {
    simplifiedConfig.validator = config.validator;
  }

  return simplifiedConfig;
}

export function createKeywordTokens<
  TName extends string,
  TConfig extends AnyKeyword,
>(name: TName, config: TConfig): CreatedKeywords<Record<TName, TConfig>> {
  const keywords = {} as Record<string, CreatedKeyword<TConfig>>;
  const mainToken = createKeywordToken(name);
  const simplifiedConfig = simplifyConfig(config);

  keywords[name] = {
    config: simplifiedConfig,
    tokenType: mainToken,
  };

  for (const alias of Object.keys(
    config.aliases ?? {},
  ) as ExtractAliases<TConfig>[]) {
    const aliasToken = createKeywordToken(alias, { categories: mainToken });
    keywords[alias] = {
      config: simplifiedConfig,
      tokenType: aliasToken,
    };
  }

  return keywords as Record<TName, CreatedKeyword<TConfig>> & {
    [K in keyof TConfig['aliases']]: TConfig;
  };
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

    for (const alias in config?.aliases ?? {}) {
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
