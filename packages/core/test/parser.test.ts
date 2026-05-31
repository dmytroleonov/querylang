import { describe, expect, it } from 'vitest';
import { createLanguage, createLexer } from '@/lexer.js';
import { createParserInstance, QlParser } from '@/parser.js';

describe(createParserInstance, () => {
  it('should not throw with correct input', () => {
    const language = createLanguage({ kw: { type: 'string' } });
    const lexer = createLexer(language.tokens);
    const parser = createParserInstance(language);
    expect(parser.instance).toBeInstanceOf(QlParser);
    const { tokens } = lexer.lex(
      ' (asdf1..& ..123 &asdf..asdf2 & ..asdf3 |kw:1| kw:null) & ( kw:!( !asdf & asdf ) ) & asdf ',
    );
    const res = parser.parse(tokens);
    expect(res.errors).toHaveLength(0);
  });
});
