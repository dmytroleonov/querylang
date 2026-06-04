import { describe, expect, it } from 'vitest';
import { toSql } from '@/sql.js';

describe(toSql, () => {
  it('should build a valid SQL', () => {
    expect(toSql({ type: 'EMPTY' })).toStrictEqual({
      sql: '1=1',
      values: [],
    });

    expect(
      toSql({
        type: 'KEYWORD',
        keyword: 'asdf',
        op: { type: 'LIKE', value: 'somevalue' },
      }),
    ).toStrictEqual({
      sql: 'asdf LIKE $1',
      values: ['somevalue'],
    });

    expect(
      toSql({
        type: 'AND',
        children: [
          {
            type: 'KEYWORD',
            keyword: 'asdf',
            op: { type: 'LIKE', value: 'somevalue' },
          },
          {
            type: 'NOT',
            operand: {
              type: 'KEYWORD',
              keyword: 'otherkw',
              op: { type: 'EQ', value: 1 },
            },
          },
          {
            type: 'OR',
            children: [
              {
                type: 'KEYWORD',
                keyword: 'otherkw2',
                op: { type: 'EQ', value: '1' },
              },
              {
                type: 'KEYWORD',
                keyword: 'otherkw3',
                op: { type: 'EQ', value: 1 },
              },
            ],
          },
        ],
      }),
    ).toStrictEqual({
      sql: 'asdf LIKE $1 AND NOT otherkw = $2 AND (otherkw2 = $3 OR otherkw3 = $4)',
      values: ['somevalue', 1, '1', 1],
    });
  });
});
