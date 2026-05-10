import { describe, expect, it } from 'vitest';
import { SearchQlError } from '@/errors/searchQlError.js';
import {
  createKeywords,
  createKeywordToken,
  createKeywordTokens,
  Keyword,
  reservedKeywords,
  validateKeyword,
} from '@/keywords/createKeywords.js';

describe(validateKeyword, () => {
  it.each(
    reservedKeywords,
  )("rejects reserved keyword: validateKeyword('%s') => SearchQlError", (reservedKeyword) => {
    expect(() => validateKeyword(reservedKeyword)).toThrow(SearchQlError);
  });

  it.each([
    '',
    '123qwe',
    '👎',
    '\n',
    'with a space',
  ])("rejects keywords that do not match keyword pattern: validateKeyword('%s') => SearchQlError", (invalidKeyword) => {
    expect(() => validateKeyword(invalidKeyword)).toThrow(SearchQlError);
  });

  it.each([
    '_',
    '___',
    'qwe123',
    'keyword',
    '_1_',
    'truefalse',
    'orand',
  ])("accepts valid keywords: validatekeyword('%s') -> void", (validKeyword) => {
    expect(() => validateKeyword(validKeyword)).not.toThrow();
  });
});

describe(createKeywordToken, () => {
  it('creates a token with the same pattern as name', () => {
    const token = createKeywordToken('keyword');
    expect(token.name).toBe('keyword');
    expect(token.PATTERN).toStrictEqual(/keyword/);
  });

  it('creates a single chevrotain token without aliases', () => {
    const tokens = createKeywordTokens('asdf', { type: 'string' });
    expect(Object.keys(tokens)).toHaveLength(1);
    expect(tokens.asdf.config).toEqual({
      type: 'string',
    });
    expect(tokens.asdf.tokenType.name).toBe('asdf');
  });

  it('creates a chevrotain token and aliases with assigned categories', () => {
    const tokens = createKeywordTokens('asdf', {
      type: 'string',
      aliases: {
        alias1: true,
        alias2: true,
      },
    });
    expect(Object.keys(tokens)).toHaveLength(3);

    const mainToken = tokens.asdf.tokenType;
    expect(mainToken.name).toBe('asdf');
    expect(mainToken.CATEGORIES).toHaveLength(1);
    expect(mainToken.CATEGORIES).to.include(Keyword);

    expect(tokens.alias1.tokenType.name).toBe('alias1');
    expect(tokens.alias1.tokenType.CATEGORIES).toHaveLength(2);
    expect(tokens.alias1.tokenType.CATEGORIES).to.include(mainToken);
    expect(tokens.alias1.tokenType.CATEGORIES).to.include(Keyword);

    expect(tokens.alias2.tokenType.name).toBe('alias2');
    expect(tokens.alias2.tokenType.CATEGORIES).toHaveLength(2);
    expect(tokens.alias2.tokenType.CATEGORIES).to.include(mainToken);
    expect(tokens.alias2.tokenType.CATEGORIES).to.include(Keyword);
  });
});

describe(createKeywords, () => {
  it('rejects invalid keywords', () => {
    expect(() => createKeywords({ '': { type: 'string' } })).toThrow(
      SearchQlError,
    );
  });

  it('rejects invalid alias', () => {
    expect(() =>
      createKeywords({ asdf: { type: 'string', aliases: { '': true } } }),
    ).toThrow(SearchQlError);
  });

  it('rejects alias that duplicates keyword', () => {
    expect(() =>
      createKeywords({ asdf: { type: 'string', aliases: { asdf: true } } }),
    ).toThrow(SearchQlError);
  });

  it('rejects duplicate alias', () => {
    expect(() =>
      createKeywords({
        keyword1: { type: 'string', aliases: { alias1: true } },
        keyword2: { type: 'string', aliases: { alias1: true } },
      }),
    ).toThrow(SearchQlError);
  });

  it('creates a token for every keyword and alias', () => {
    const keywords = createKeywords({
      keyword1: { type: 'string' },
      keyword2: { type: 'string', aliases: { kw2: true } },
      keyword3: { type: 'string', aliases: { kw3: true, k3: true } },
    });

    expect(Object.keys(keywords)).toHaveLength(6);
    expect(keywords.keyword1.config).toStrictEqual({
      type: 'string',
    });
    expect(keywords.keyword1.tokenType.name).toBe('keyword1');
    expect(keywords.keyword1.tokenType.PATTERN).toStrictEqual(/keyword1/);

    expect(keywords.keyword2.config).toStrictEqual({
      type: 'string',
    });
    expect(keywords.keyword2.tokenType.name).toBe('keyword2');

    expect(keywords.kw2.config).toStrictEqual({
      type: 'string',
    });
    expect(keywords.kw2.tokenType.name).toBe('kw2');

    expect(keywords.keyword3.config).toStrictEqual({
      type: 'string',
    });
    expect(keywords.keyword3.tokenType.name).toBe('keyword3');

    expect(keywords.kw3.config).toStrictEqual({
      type: 'string',
    });
    expect(keywords.kw3.tokenType.name).toBe('kw3');

    expect(keywords.k3.config).toStrictEqual({
      type: 'string',
    });
    expect(keywords.k3.tokenType.name).toBe('k3');
  });
});
