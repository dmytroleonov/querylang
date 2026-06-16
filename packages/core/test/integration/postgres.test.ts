import { describe, expect, it } from 'vitest';
import { createQlParser } from '@/parser.js';
import { toSql } from '@/sql.js';
import { numberTransformer } from '@/transformer.js';

function getParser() {
  return createQlParser({
    author: { type: 'string', aliases: { a: true } },
    user: { type: 'string', aliases: { u: true } },
    content: { type: 'string', aliases: { cnt: true, cn: true } },
    context: { type: 'string', aliases: { ctx: true, cx: true } },
    likes: { type: 'number', transform: numberTransformer({ min: 0 }) },
    dislikes: { type: 'number', transform: numberTransformer({ min: 0 }) },
    is_private: { type: 'boolean', aliases: { private: true } },
  });
}

describe('parse and convert to postgres', () => {
  it('a single string', () => {
    const parser = getParser();
    expect(toSql(parser.parse('search').ast)).toStrictEqual({
      sql: '("author" ILIKE $1 OR "user" ILIKE $2 OR "content" ILIKE $3 OR "context" ILIKE $4)',
      parameters: ['%search%', '%search%', '%search%', '%search%'],
    });
  });

  it('a single string with modifier', () => {
    const parser = getParser();
    expect(toSql(parser.parse('=search').ast)).toStrictEqual({
      sql: '("author" = $1 OR "user" = $2 OR "content" = $3 OR "context" = $4)',
      parameters: ['search', 'search', 'search', 'search'],
    });
    expect(toSql(parser.parse('~"search this"').ast)).toStrictEqual({
      sql: '("author" LIKE $1 OR "user" LIKE $2 OR "content" LIKE $3 OR "context" LIKE $4)',
      parameters: [
        '%search this%',
        '%search this%',
        '%search this%',
        '%search this%',
      ],
    });
  });

  it('a single keyword with value', () => {
    const parser = getParser();
    expect(toSql(parser.parse('user:=dmytro').ast)).toStrictEqual({
      sql: '"user" = $1',
      parameters: ['dmytro'],
    });
    expect(toSql(parser.parse('likes:5').ast)).toStrictEqual({
      sql: '"likes" = $1',
      parameters: [5],
    });
  });

  it('a single aliased keyword with value', () => {
    const parser = getParser();
    expect(toSql(parser.parse('u:=dmytro').ast)).toStrictEqual({
      sql: '"user" = $1',
      parameters: ['dmytro'],
    });
  });

  it('multiple values', () => {
    const parser = getParser();
    expect(toSql(parser.parse("=search | ='other search'").ast)).toStrictEqual({
      sql: '(("author" = $1 OR "user" = $2 OR "content" = $3 OR "context" = $4) OR ("author" = $5 OR "user" = $6 OR "content" = $7 OR "context" = $8))',
      parameters: [
        'search',
        'search',
        'search',
        'search',
        'other search',
        'other search',
        'other search',
        'other search',
      ],
    });
  });

  it('multiple values for the same keyword', () => {
    const parser = getParser();
    expect(
      toSql(parser.parse('likes:(<=5 | 10 | 100..200 | >250 & <300)').ast),
    ).toStrictEqual({
      sql: '("likes" <= $1 OR "likes" = $2 OR "likes" BETWEEN $3 AND $4 OR "likes" > $5 AND "likes" < $6)',
      parameters: [5, 10, 100, 200, 250, 300],
    });
  });

  it('multiple values for multiple keywords', () => {
    const parser = getParser();
    expect(
      toSql(parser.parse('likes:(>=100 <200) dislikes:(<20 >0)').ast),
    ).toStrictEqual({
      sql: '"likes" >= $1 AND "likes" < $2 AND "dislikes" < $3 AND "dislikes" > $4',
      parameters: [100, 200, 20, 0],
    });
  });

  it('combination of global and keyword searches', () => {
    const parser = getParser();
    expect(
      toSql(
        parser.parse(
          'private:true likes:>5 | private:false "search string" dislikes:<1',
        ).ast,
      ),
    ).toStrictEqual({
      sql: '("is_private" = $1 AND "likes" > $2 OR "is_private" = $3 AND ("author" ILIKE $4 OR "user" ILIKE $5 OR "content" ILIKE $6 OR "context" ILIKE $7) AND "dislikes" < $8)',
      parameters: [
        true,
        5,
        false,
        '%search string%',
        '%search string%',
        '%search string%',
        '%search string%',
        1,
      ],
    });
  });
});
