import { describe, expect, it } from 'vitest';
import { SearchQlError } from '@/errors/searchQlError.js';
import {
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
