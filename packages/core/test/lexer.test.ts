import { createToken, type TokenType } from 'chevrotain';
import { describe, expect, it } from 'vitest';
import {
  createChevrotainLexer,
  createLanguage,
  insertBuiltinTokens,
  sortTokens,
} from '@/lexer.js';

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

describe(createLanguage, () => {
  it('should create and return keywords and tokens', () => {
    const language = createLanguage({
      kw: { type: 'string', aliases: { keyword: true } },
    });
    expect(language.keywords).toMatchObject({
      kw: { config: { type: 'string' } },
      keyword: { config: { type: 'string' } },
    });
    expect(language.tokens.length).toBeGreaterThan(0);
  });
});

describe(createChevrotainLexer, () => {
  it('should not throw with correct input', () => {
    const language = createLanguage({ kw: { type: 'string' } });
    expect(() => createChevrotainLexer(language.tokens)).not.toThrow();
  });

  it('should lex built-in tokens', () => {
    const language = createLanguage({ kw: { type: 'string' } });
    const lexer = createChevrotainLexer(language.tokens);
    const res = lexer.tokenize(
      `!kw:(& | = ~ null 123.123 val1 >= <= > < \n\t\ra..b)`,
    );
    expect(res.errors).toHaveLength(0);
    expect(res.tokens).toMatchObject([
      { tokenType: { name: 'not' }, image: '!' },
      { tokenType: { name: 'kw' }, image: 'kw' },
      { tokenType: { name: 'colon' }, image: ':' },
      { tokenType: { name: 'lParen' }, image: '(' },
      { tokenType: { name: 'and' }, image: '&' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'or' }, image: '|' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'eq' }, image: '=' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'tilde' }, image: '~' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'null' }, image: 'null' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'number' }, image: '123.123' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'value' }, image: 'val1' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'gte' }, image: '>=' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'lte' }, image: '<=' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'gt' }, image: '>' },
      { tokenType: { name: 'whitespace' }, image: ' ' },
      { tokenType: { name: 'lt' }, image: '<' },
      { tokenType: { name: 'whitespace' }, image: ' \n\t\r' },
      { tokenType: { name: 'value' }, image: 'a' },
      { tokenType: { name: 'range' }, image: '..' },
      { tokenType: { name: 'value' }, image: 'b' },
      { tokenType: { name: 'rParen' }, image: ')' },
    ]);
  });
});
