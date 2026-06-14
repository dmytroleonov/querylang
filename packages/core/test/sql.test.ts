import { describe, expect, it } from 'vitest';
import { toSql } from '@/sql.js';

describe(toSql, () => {
  it('should build a valid SQL', () => {
    expect(toSql({ type: 'EMPTY' })).toStrictEqual({
      sql: '1=1',
      parameters: [],
    });

    expect(
      toSql<{ asdf: string }>({
        type: 'PREDICATE',
        keyword: 'asdf',
        op: { type: 'LIKE', value: 'somevalue' },
      }),
    ).toStrictEqual({
      sql: '"asdf" LIKE $1',
      parameters: ['%somevalue%'],
    });

    expect(
      toSql<{
        asdf: string;
        otherkw: number;
        otherkw2: string;
        otherkw3: number;
      }>({
        type: 'AND',
        children: [
          {
            type: 'PREDICATE',
            keyword: 'asdf',
            op: { type: 'LIKE', value: 'somevalue' },
          },
          {
            type: 'NOT',
            operand: {
              type: 'PREDICATE',
              keyword: 'otherkw',
              op: { type: 'EQ', value: 1 },
            },
          },
          {
            type: 'OR',
            children: [
              {
                type: 'PREDICATE',
                keyword: 'otherkw2',
                op: { type: 'EQ', value: '1' },
              },
              {
                type: 'PREDICATE',
                keyword: 'otherkw3',
                op: { type: 'EQ', value: 1 },
              },
            ],
          },
        ],
      }),
    ).toStrictEqual({
      sql: '"asdf" LIKE $1 AND NOT "otherkw" = $2 AND ("otherkw2" = $3 OR "otherkw3" = $4)',
      parameters: ['%somevalue%', 1, '1', 1],
    });
  });
});
