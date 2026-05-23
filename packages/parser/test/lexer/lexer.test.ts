import { createToken, type TokenType } from 'chevrotain';
import { describe, expect, it } from 'vitest';
import { createKeywords } from '@/keywords/createKeywords.js';
import { createLexer, insertBuiltinTokens, sortTokens } from '@/lexer/lexer.js';

describe(sortTokens, () => {
  it('should sort tokens in a reverse alphabetical order', () => {
    const sorted = sortTokens([
      createToken({ name: 'us' }),
      createToken({ name: 'u' }),
      createToken({ name: 'user' }),
      createToken({ name: 'nul' }),
      createToken({ name: 'nulla' }),
      createToken({ name: 'nu' }),
      createToken({ name: 'n' }),
      createToken({ name: 'nullab' }),
    ]);
    expect(sorted.map((t) => t.name)).toStrictEqual([
      'user',
      'us',
      'u',
      'nullab',
      'nulla',
      'nul',
      'nu',
      'n',
    ]);
  });
});

describe(insertBuiltinTokens, () => {
  it('inserts sortable tokens at the right position', () => {
    const tokens: TokenType[] = sortTokens([
      createToken({ name: 'nullab' }),
      createToken({ name: 'nulla' }),
      createToken({ name: 'nul' }),
      createToken({ name: 'nu' }),
      createToken({ name: 'n' }),
    ]);
    insertBuiltinTokens(tokens);
    expect(tokens.map((t) => t.name)).toStrictEqual([
      'nullab',
      'nulla',
      'null',
      'nul',
      'nu',
      'n',
    ]);
  });
});

describe(createLexer, () => {
  it('should not throw with correct input', () => {
    const keywords = createKeywords({ kw: { type: 'string' } });
    expect(() => createLexer(keywords)).not.toThrow();
  });

  it('should lex built-in tokens', () => {
    const keywords = createKeywords({ kw: { type: 'string' } });
    const lexer = createLexer(keywords);
    const res = lexer.lex(
      `!kw:(val1 & val2 | =val3 | ~val4 | null | 123.123\\")`,
    );
    expect(res.tokens).toMatchObject([
      { tokenType: { name: 'not' }, image: '!' },
      { tokenType: { name: 'kw' }, image: 'kw' },
      { tokenType: { name: 'colon' }, image: ':' },
      { tokenType: { name: 'lParen' }, image: '(' },
      { tokenType: { name: 'value' }, image: 'val1' },
      { tokenType: { name: 'and' }, image: '&' },
      { tokenType: { name: 'value' }, image: 'val2' },
      { tokenType: { name: 'or' }, image: '|' },
      { tokenType: { name: 'eq' }, image: '=' },
      { tokenType: { name: 'value' }, image: 'val3' },
      { tokenType: { name: 'or' }, image: '|' },
      { tokenType: { name: 'tilde' }, image: '~' },
      { tokenType: { name: 'value' }, image: 'val4' },
      { tokenType: { name: 'or' }, image: '|' },
      { tokenType: { name: 'null' }, image: 'null' },
      { tokenType: { name: 'or' }, image: '|' },
      { tokenType: { name: 'value' }, image: '123.123\\"' },
      { tokenType: { name: 'rParen' }, image: ')' },
    ]);
  });
});
