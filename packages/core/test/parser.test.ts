import { describe, expect, it } from 'vitest';
import { createLanguage, createLexer } from '@/lexer.js';
import { createChevrotainParser, QlParser } from '@/parser.js';

describe(createChevrotainParser, () => {
  it('should not throw with correct input', () => {
    const language = createLanguage({ kw: { type: 'string' } });
    const lexer = createLexer(language.tokens);
    const parser = createChevrotainParser(language);
    expect(parser.instance).toBeInstanceOf(QlParser);
    const { tokens } = lexer.lex(
      ' (asdf1..& ..123 &asdf..asdf2 & ..asdf3 |kw:1| kw:null) & ( kw:!( !asdf & asdf ) ) & asdf ',
    );
    const res = parser.parse(tokens);
    expect(res.errors).toHaveLength(0);
  });
});
