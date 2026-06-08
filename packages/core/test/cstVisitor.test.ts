import { describe, expect, it } from 'vitest';
import { createChevrotainCstVisitor } from '@/cstVisitor.js';
import { createQlParser } from '@/parser.js';
import type { Empty } from '@/types.js';

// TODO: test null values
// should only allow null gobally and as keyword value
// should not allow any modifiers besides = with null
// should not allow null in ranges

const empty: Empty = { type: 'EMPTY' };

describe(createChevrotainCstVisitor, () => {
  it('should create an AST with a valid input', () => {
    const parser = createQlParser({ kw: { type: 'string' } });
    const { ast, errors } = parser.parse('kw:!(search (=dimon | !~serega))');
    expect(errors).toStrictEqual([]);
    expect(ast).toStrictEqual({
      operand: {
        children: [
          {
            keyword: 'kw',
            type: 'PREDICATE',
            op: {
              type: 'ILIKE',
              value: 'search',
            },
          },
          {
            children: [
              {
                keyword: 'kw',
                type: 'PREDICATE',
                op: {
                  type: 'EQ',
                  value: 'dimon',
                },
              },
              {
                operand: {
                  keyword: 'kw',
                  type: 'PREDICATE',
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

  it('should return empty ast with an empty input', () => {
    const parser = createQlParser({ kw: { type: 'string' } });
    const emptyInputs = ['', ' ', ' \n\t\r'];
    for (const input of emptyInputs) {
      const { ast, errors } = parser.parse(input);
      expect(ast).toStrictEqual(empty);
      expect(errors).toStrictEqual([]);
    }
  });
});
