import { describe, expect, it } from 'vitest';
import { createChevrotainCstVisitor } from '@/cstVisitor.js';
import { createQlParser } from '@/parser.js';

describe(createChevrotainCstVisitor, () => {
  it('should create an AST with a valid input', () => {
    const parser = createQlParser({ kw: { type: 'string' } });
    const { ast, errors } = parser.parse('kw:!(search (=dimon | !~serega))');
    expect(errors.parser).toStrictEqual([]);
    expect(errors.lexer).toStrictEqual([]);
    expect(errors.visitor).toStrictEqual([]);
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
