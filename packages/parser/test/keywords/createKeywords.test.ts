import { describe, expect, it } from 'vitest';
import { SearchQlError } from '@/errors/searchQlError.js';
import {
  createKeywords,
  createKeywordToken,
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
      expect(() => validateKeyword(validKeyword)).not.toThrow;
    },
  );
});

describe('createKeywordToken', () => {
  it('creates a chevrotain token with a provided name and alias as pattern', () => {
    const token = createKeywordToken('asdf');
    expect(token.name).toBe('asdf');
    expect(token.PATTERN).toStrictEqual(/asdf/);

    const tokenWithEmptyAlias = createKeywordToken('asdf', []);
    expect(tokenWithEmptyAlias.name).toBe('asdf');
    expect(tokenWithEmptyAlias.PATTERN).toStrictEqual(/asdf/);

    const tokenWithAlias = createKeywordToken('asdf', ['alias1', 'alias2']);
    expect(tokenWithAlias.name).toBe('asdf');
    expect(tokenWithAlias.PATTERN).toStrictEqual(/asdf\|alias1\|alias2/);
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

  it('creates a token config for every keyword', () => {
    const keywords = createKeywords({
      keyword1: { type: 'string', alias: ['kw1'] },
      keyword2: { type: 'string', alias: ['kw2'] },
    });
    expect(keywords.keyword1.config).toEqual({
      type: 'string',
      alias: ['kw1'],
    });
    expect(keywords.keyword1.tokenType.name).toBe('keyword1');
    expect(keywords.keyword1.tokenType.PATTERN).toStrictEqual(/keyword1\|kw1/);

    expect(keywords.keyword2.config).toEqual({
      type: 'string',
      alias: ['kw2'],
    });
    expect(keywords.keyword2.tokenType.name).toBe('keyword2');
    expect(keywords.keyword2.tokenType.PATTERN).toStrictEqual(/keyword2\|kw2/);
  });
});
