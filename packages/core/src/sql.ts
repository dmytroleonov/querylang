import type { Ast, Expression, KeywordTypes } from '@/types.js';
import { QueryLangException } from './erorr.js';

export type ToSqlResult = {
  sql: string;
  values: unknown[];
};

type SqlCtx = {
  values: unknown[];
};

export function toSql<TConfig extends KeywordTypes>(
  ast: Ast<TConfig>,
): ToSqlResult {
  if (ast.type === 'EMPTY') {
    return {
      sql: '1=1',
      values: [],
    };
  }
  const ctx: SqlCtx = { values: [] };

  const sql = buildExpression(ast, ctx);

  return {
    sql,
    values: ctx.values,
  };
}

function buildExpression<TConfig extends KeywordTypes>(
  expr: Expression<TConfig>,
  ctx: SqlCtx,
): string {
  const exprType = expr.type;

  switch (exprType) {
    case 'AND': {
      if (!expr.children.length) {
        return '1=1';
      }

      return expr.children
        .map((child) => buildExpression(child, ctx))
        .join(' AND ');
    }

    case 'OR': {
      if (!expr.children.length) {
        return '1=1';
      }

      const expressions = expr.children.map((child) =>
        buildExpression(child, ctx),
      );
      if (expressions.length === 1) {
        return expressions[0]!;
      }

      return `(${expressions.join(' OR ')})`;
    }

    case 'NOT': {
      const inner = buildExpression(expr.operand, ctx);
      return `NOT ${inner}`;
    }

    case 'PREDICATE': {
      const opType = expr.op.type;

      switch (opType) {
        case 'ILIKE': {
          const value = `%${expr.op.value}%`;
          const idx = ctx.values.push(value);
          const placeholder = `$${idx}`;
          return `"${expr.keyword}" ILIKE ${placeholder}`;
        }
        case 'LIKE': {
          const value = `%${expr.op.value}%`;
          const idx = ctx.values.push(value);
          const placeholder = `$${idx}`;
          return `"${expr.keyword}" LIKE ${placeholder}`;
        }
        case 'BETWEEN': {
          const lIdx = ctx.values.push(expr.op.min);
          const rIdx = ctx.values.push(expr.op.max);
          const lPlaceholder = `$${lIdx}`;
          const rPlaceholder = `$${rIdx}`;
          return `"${expr.keyword}" BETWEEN ${lPlaceholder} AND ${rPlaceholder}`;
        }
        case 'EQ': {
          const idx = ctx.values.push(expr.op.value);
          const placeholder = `$${idx}`;
          return `"${expr.keyword}" = ${placeholder}`;
        }
        case 'LT': {
          const idx = ctx.values.push(expr.op.value);
          const placeholder = `$${idx}`;
          return `"${expr.keyword}" < ${placeholder}`;
        }
        case 'LTE': {
          const idx = ctx.values.push(expr.op.value);
          const placeholder = `$${idx}`;
          return `"${expr.keyword}" <= ${placeholder}`;
        }
        case 'GT': {
          const idx = ctx.values.push(expr.op.value);
          const placeholder = `$${idx}`;
          return `"${expr.keyword}" > ${placeholder}`;
        }
        case 'GTE': {
          const idx = ctx.values.push(expr.op.value);
          const placeholder = `$${idx}`;
          return `"${expr.keyword}" >= ${placeholder}`;
        }
        case 'IS_NULL': {
          return `"${expr.keyword}" IS NULL`;
        }
        default: {
          throw new QueryLangException(
            `Unknown operation type: "${opType satisfies never}"`,
          );
        }
      }
    }

    default: {
      throw new QueryLangException(
        `Unknown expression type: "${exprType satisfies never}"`,
      );
    }
  }
}
