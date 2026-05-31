import { describe, expect, it } from 'vitest';
import { createLanguage, createLexer } from '@/lexer/lexer.js';
import { createParser } from '@/parser.js';

describe(createParser, () => {
  it('should not throw with correct input', () => {
    const language = createLanguage({ kw: { type: 'string' } });
    const lexer = createLexer(language.tokens);
    const parser = createParser(language);
    const { tokens } = lexer.lex(
      ' (asdf1..& ..123 &asdf..asdf2 & ..asdf3 |kw:1| kw:null) & ( kw:!( !asdf & asdf ) ) & asdf ',
    );
    const res = parser.parse(tokens);
    expect(res.errors).toHaveLength(0);
  });
});
