import { describe, expect, it } from 'vitest';
import { createChevrotainLexer, createLanguage } from '@/lexer.js';
import { createChevrotainParser, InternalQlParser } from '@/parser.js';

describe(createChevrotainParser, () => {
  it('should not throw with correct input', () => {
    const language = createLanguage({ kw: { type: 'string' } });
    const lexer = createChevrotainLexer(language.tokens);
    const parser = createChevrotainParser(language.tokens);
    expect(parser.instance).toBeInstanceOf(InternalQlParser);
    const { tokens } = lexer.tokenize(
      ' (asdf1..& ..123 &asdf..asdf2 & ..asdf3 |kw:1| kw:null) & ( kw:!( !asdf & asdf ) ) & asdf ',
    );
    const res = parser.parse(tokens);
    expect(res.errors).toHaveLength(0);
  });
});
