import { describe, expect, it } from 'vitest';
import { createChevrotainCstVisitor } from '@/cstVisitor.js';
import { createChevrotainLexer, createLanguage } from '@/lexer.js';
import { createChevrotainParser } from '@/parser.js';

describe(createChevrotainCstVisitor, () => {
  it('should create an AST with a valid input', () => {
    const language = createLanguage({ kw: { type: 'string' } });
    const lexer = createChevrotainLexer(language.tokens);
    const parser = createChevrotainParser(language.tokens);
    const visitor = createChevrotainCstVisitor(
      language.keywords,
      parser.instance,
    );
    const { tokens } = lexer.tokenize('kw:!(search (=dimon | !~serega))');
    const { node } = parser.parse(tokens);
    const { ast } = visitor.visit(node);
    expect(ast).toStrictEqual({
      operand: {
        children: [
          {
            keyword: 'kw',
            type: 'KEYWORD',
            op: {
              type: 'ILIKE',
              value: 'search',
            },
          },
          {
            children: [
              {
                keyword: 'kw',
                type: 'KEYWORD',
                op: {
                  type: 'EQ',
                  value: 'dimon',
                },
              },
              {
                operand: {
                  keyword: 'kw',
                  type: 'KEYWORD',
                  op: {
                    type: 'LIKE',
                    value: 'serega',
                  },
                },
                type: 'NOT',
              },
            ],
            type: 'OR',
          },
        ],
        type: 'AND',
      },
      type: 'NOT',
    });
  });
});
