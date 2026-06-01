import { describe, expect, it } from 'vitest';
import { createChevrotainCstVisitor } from '@/cstVisitor.js';
import { createChevrotainLexer, createLanguage } from '@/lexer.js';
import { createChevrotainParser } from '@/parser.js';

describe(createChevrotainCstVisitor, () => {
  it.fails('should create an AST with a valid input', () => {
    const language = createLanguage({ kw: { type: 'string' } });
    const lexer = createChevrotainLexer(language.tokens);
    const parser = createChevrotainParser(language.tokens);
    const visitor = createChevrotainCstVisitor(
      language.keywords,
      parser.instance,
    );
    const { tokens } = lexer.tokenize('asdf');
    const { node } = parser.parse(tokens);
    const { ast } = visitor.visit(node);
    expect(ast).toStrictEqual({
      type: 'KEYWORD',
      keyword: 'kw',
      value: {
        op: 'ILIKE',
        value: 'asdf',
      },
    });
  });
});
