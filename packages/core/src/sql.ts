import type { Ast, Expression, KeywordTypes } from '@/types.js';
import { QueryLangException } from './erorr.js';

export type FieldOverrides<TConfig extends KeywordTypes> = {
  [K in keyof TConfig]?: string;
};

export type ToSqlConfig<TConfig extends KeywordTypes> = {
  parameterOffset?: number;
  fieldOverrides?: FieldOverrides<TConfig>;
};

export type ToSqlResult = {
  sql: string;
  parameters: unknown[];
};

type SqlCtx<TConfig extends KeywordTypes> = {
  parameterOffset: number;
  fieldOverrides: FieldOverrides<TConfig>;
  parameters: unknown[];
};

export function toSql<TConfig extends KeywordTypes>(
  ast: Ast<TConfig>,
  config?: ToSqlConfig<TConfig>,
): ToSqlResult {
  const { parameterOffset = 0, fieldOverrides = {} } = config ?? {};

  if (ast.type === 'EMPTY') {
    return {
      sql: '1=1',
      parameters: [],
    };
  }
  const ctx: SqlCtx<TConfig> = {
    parameters: [],
    parameterOffset,
    fieldOverrides,
  };

  const sql = buildExpression(ast, ctx);

  return {
    sql,
    parameters: ctx.parameters,
  };
}

function buildExpression<TConfig extends KeywordTypes>(
  expr: Expression<TConfig>,
  ctx: SqlCtx<TConfig>,
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
      const field = ctx.fieldOverrides[expr.keyword] ?? `"${expr.keyword}"`;

      switch (opType) {
        case 'ILIKE': {
          const value = `%${expr.op.value}%`;
          const idx = ctx.parameters.push(value) + ctx.parameterOffset;
          const placeholder = `$${idx}`;
          return `${field} ILIKE ${placeholder}`;
        }
        case 'LIKE': {
          const value = `%${expr.op.value}%`;
          const idx = ctx.parameters.push(value) + ctx.parameterOffset;
          const placeholder = `$${idx}`;
          return `${field} LIKE ${placeholder}`;
        }
        case 'BETWEEN': {
          const lIdx = ctx.parameters.push(expr.op.min) + ctx.parameterOffset;
          const rIdx = ctx.parameters.push(expr.op.max) + ctx.parameterOffset;
          const lPlaceholder = `$${lIdx}`;
          const rPlaceholder = `$${rIdx}`;
          return `${field} BETWEEN ${lPlaceholder} AND ${rPlaceholder}`;
        }
        case 'EQ': {
          const idx = ctx.parameters.push(expr.op.value) + ctx.parameterOffset;
          const placeholder = `$${idx}`;
          return `${field} = ${placeholder}`;
        }
        case 'LT': {
          const idx = ctx.parameters.push(expr.op.value) + ctx.parameterOffset;
          const placeholder = `$${idx}`;
          return `${field} < ${placeholder}`;
        }
        case 'LTE': {
          const idx = ctx.parameters.push(expr.op.value) + ctx.parameterOffset;
          const placeholder = `$${idx}`;
          return `${field} <= ${placeholder}`;
        }
        case 'GT': {
          const idx = ctx.parameters.push(expr.op.value) + ctx.parameterOffset;
          const placeholder = `$${idx}`;
          return `${field} > ${placeholder}`;
        }
        case 'GTE': {
          const idx = ctx.parameters.push(expr.op.value) + ctx.parameterOffset;
          const placeholder = `$${idx}`;
          return `${field} >= ${placeholder}`;
        }
        case 'IS_NULL': {
          return `${field} IS NULL`;
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
