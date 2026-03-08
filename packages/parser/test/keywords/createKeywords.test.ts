import { describe, expect, it } from 'vitest';
import { SearchQlError } from '@/errors/searchQlError.js';
import {
  createKeywords,
  createKeywordToken,
  createKeywordTokens,
  reservedKeywords,
  validateKeyword,
} from '@/keywords/createKeywords.js';

describe('validateKeyword', () => {
  it.each(reservedKeywords)(
    "rejects reserved keyword: validateKeyword('%s') => SearchQlError",
    (reservedKeyword) => {
      expect(() => validateKeyword(reservedKeyword)).toThrow(SearchQlError);
    },
  );

  it.each(['', '123qwe', '👎', '\n', 'with a space'])(
    "rejects keywords that do not match keyword pattern: validateKeyword('%s') => SearchQlError",
    (invalidKeyword) => {
      expect(() => validateKeyword(invalidKeyword)).toThrow(SearchQlError);
    },
  );

  it.each(['_', '___', 'qwe123', 'keyword', '_1_', 'truefalse', 'orand'])(
    "accepts valid keywords: validatekeyword('%s') -> void",
    (validKeyword) => {
      expect(() => validateKeyword(validKeyword)).not.toThrow();
    },
  );
});

describe('createKeywordToken', () => {
  it('creates a token with the same pattern as name', () => {
    const token = createKeywordToken('keyword');
    expect(token.name).toBe('keyword');
    expect(token.PATTERN).toStrictEqual(/keyword/);
  });
});

describe('createKeywordTokens', () => {
  it('creates a chevrotain token without aliases', () => {
    const tokens = createKeywordTokens('asdf');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.name).toBe('asdf');
    expect(tokens[0]?.PATTERN).toStrictEqual(/asdf/);
  });

  it('creates a chevrotain token and aliases', () => {
    const tokensWithAlias = createKeywordTokens('asdf', ['alias1', 'alias2']);
    expect(tokensWithAlias).toHaveLength(3);

    const mainToken = tokensWithAlias[0];
    expect(mainToken?.name).toBe('asdf');

    expect(tokensWithAlias[1]?.name).toBe('alias1');
    expect(tokensWithAlias[1]?.CATEGORIES).toHaveLength(1);
    expect(tokensWithAlias[1]?.CATEGORIES?.[0]).toBe(mainToken);

    expect(tokensWithAlias[2]?.name).toBe('alias2');
    expect(tokensWithAlias[2]?.CATEGORIES).toHaveLength(1);
    expect(tokensWithAlias[2]?.CATEGORIES?.[0]).toBe(mainToken);
  });
});

describe('createKeywords', () => {
  it('rejects invalid keywords', () => {
    expect(() => createKeywords({ '': { type: 'string' } })).toThrow(
      SearchQlError,
    );
  });

  it('rejects invalid alias', () => {
    expect(() =>
      createKeywords({ asdf: { type: 'string', alias: [''] } }),
    ).toThrow(SearchQlError);
  });

  it('rejects alias that duplicates keyword', () => {
    expect(() =>
      createKeywords({ asdf: { type: 'string', alias: ['asdf'] } }),
    ).toThrow(SearchQlError);
  });

  it('rejects duplicate alias', () => {
    expect(() =>
      createKeywords({
        keyword1: { type: 'string', alias: ['alias1'] },
        keyword2: { type: 'string', alias: ['alias1'] },
      }),
    ).toThrow(SearchQlError);
  });

  it('creates a token for every keyword and alias', () => {
    const keywords = createKeywords({
      keyword1: { type: 'string' },
      keyword2: { type: 'string', alias: ['kw2'] },
      keyword3: { type: 'string', alias: ['kw3', 'k3'] },
    });

    expect(keywords.keyword1).toHaveLength(1);
    expect(keywords.keyword1[0]?.config).toEqual({
      type: 'string',
    });
    expect(keywords.keyword1[0]?.tokenType.name).toBe('keyword1');
    expect(keywords.keyword1[0]?.tokenType.PATTERN).toStrictEqual(/keyword1/);

    expect(keywords.keyword2).toHaveLength(2);
    expect(keywords.keyword2[0]?.config).toEqual({
      type: 'string',
      alias: ['kw2'],
    });
    expect(keywords.keyword2[0]?.tokenType.name).toBe('keyword2');
    expect(keywords.keyword2[1]?.tokenType.name).toBe('kw2');

    expect(keywords.keyword3).toHaveLength(3);
    expect(keywords.keyword3[0]?.config).toEqual({
      type: 'string',
      alias: ['kw3', 'k3'],
    });
    expect(keywords.keyword3[0]?.tokenType.name).toBe('keyword3');
    expect(keywords.keyword3[1]?.tokenType.name).toBe('kw3');
    expect(keywords.keyword3[2]?.tokenType.name).toBe('k3');
  });
});
