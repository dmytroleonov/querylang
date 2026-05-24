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
    const res = lexer.lex(`!kw:(& | = ~ null 123.123 val1 >= <= > < a..b)`);
    expect(res.errors).toHaveLength(0);
    expect(res.tokens).toMatchObject([
      { tokenType: { name: 'not' }, image: '!' },
      { tokenType: { name: 'kw' }, image: 'kw' },
      { tokenType: { name: 'colon' }, image: ':' },
      { tokenType: { name: 'lParen' }, image: '(' },
      { tokenType: { name: 'and' }, image: '&' },
      { tokenType: { name: 'or' }, image: '|' },
      { tokenType: { name: 'eq' }, image: '=' },
      { tokenType: { name: 'tilde' }, image: '~' },
      { tokenType: { name: 'null' }, image: 'null' },
      { tokenType: { name: 'number' }, image: '123.123' },
      { tokenType: { name: 'value' }, image: 'val1' },
      { tokenType: { name: 'gte' }, image: '>=' },
      { tokenType: { name: 'lte' }, image: '<=' },
      { tokenType: { name: 'gt' }, image: '>' },
      { tokenType: { name: 'lt' }, image: '<' },
      { tokenType: { name: 'value' }, image: 'a' },
      { tokenType: { name: 'range' }, image: '..' },
      { tokenType: { name: 'value' }, image: 'b' },
      { tokenType: { name: 'rParen' }, image: ')' },
    ]);
  });
});
