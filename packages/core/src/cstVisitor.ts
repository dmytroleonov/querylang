// biome-ignore-all lint/suspicious/noExplicitAny: todo better types
import type { CstNode } from 'chevrotain';
import { Null, QuotedValue, Value } from '@/builtin.js';
import type { CreatedKeywords } from '@/createKeywords.js';
import type {
  AndExpressionCstChildren,
  AtomicExpressionCstChildren,
  FullRangeCstChildren,
  IQueryLangToken,
  IQueryLangVisitor,
  KeywordExpressionCstChildren,
  KeywordOrAtomicExpressionCstChildren,
  LeftBoundedRangeCstChildren,
  OrExpressionCstChildren,
  ParenthesisExpressionCstChildren,
  RangeExpressionCstChildren,
  RightBoundedRangeCstChildren,
  ValueExpressionCstChildren,
} from '@/cstVisitor.types.js';
import { QueryLangException } from '@/erorr.js';
import type { InternalQlParser } from '@/parser.js';
import type {
  AnyKeyword,
  AnyOpType,
  AnyPredicateExpression,
  Ast,
  CreateKeywordInput,
  DataType,
  Expression,
  InferKeywordConfig,
  KeywordDataType,
  Op,
  QueryLangError,
} from '@/types.js';
import { escapeString, matchesToken } from '@/utils.js';

export type QueryLangCstVisitorResult<TKeywords extends CreateKeywordInput> = {
  errors: QueryLangError[];
  ast: Ast<InferKeywordConfig<TKeywords>>;
};

export type QueryLangCstVisitor<TKeywords extends CreateKeywordInput> = {
  visit: (node: CstNode) => QueryLangCstVisitorResult<TKeywords>;
};

const ALLOWED_GLOBAL_SEARCHES =
  'global searches are only allowed with "~" and "="';
const NULL_IS_INVALID_IN_RANGES =
  '->null<- cannot be used in range lookups. Wrap it in single or double quotes \
to perform a string lookup';

export type VisitorParam<TKeywords extends CreateKeywordInput> = {
  keyword?: Extract<keyof TKeywords, string>;
};

export function createChevrotainCstVisitor<
  TKeywords extends CreateKeywordInput,
>(
  keywords: CreatedKeywords<TKeywords>,
  parser: InternalQlParser,
): QueryLangCstVisitor<TKeywords> {
  type OutputAst = Expression<{ [x: string]: KeywordDataType }>;
  type Param = VisitorParam<TKeywords>;
  const originalKeywords = {} as CreatedKeywords<{ [kw: string]: AnyKeyword }>;
  for (const [kw, definition] of Object.entries(keywords)) {
    if (definition.originalKeyword === kw) {
      originalKeywords[kw] = definition;
    }
  }

  class QlCstVisitor
    extends parser.getBaseCstVisitorConstructor<Param, OutputAst>()
    implements IQueryLangVisitor<Param, OutputAst>
  {
    private errors: QueryLangError[] = [];

    constructor() {
      super();
      this.validateVisitor();
    }

    private addError(error: QueryLangError): void {
      this.errors.push(error);
    }

    public getErrors(): QueryLangError[] {
      return structuredClone(this.errors);
    }

    orExpression(ctx: OrExpressionCstChildren, param?: Param): OutputAst {
      if (ctx.andExpression.length === 1) {
        return this.visit(ctx.andExpression, param);
      }

      return {
        type: 'OR',
        children: ctx.andExpression.map((expression) =>
          this.visit(expression, param),
        ),
      };
    }

    andExpression(ctx: AndExpressionCstChildren, param?: Param): OutputAst {
      if (ctx.keywordOrAtomicExpression.length === 1) {
        return this.visit(ctx.keywordOrAtomicExpression, param);
      }

      return {
        type: 'AND',
        children: ctx.keywordOrAtomicExpression.map((expression) =>
          this.visit(expression, param),
        ),
      };
    }

    keywordOrAtomicExpression(
      ctx: KeywordOrAtomicExpressionCstChildren,
      param?: Param,
    ): OutputAst {
      if (ctx.keywordExpression) {
        return this.visit(ctx.keywordExpression);
      }
      if (ctx.atomicExpression) {
        return this.visit(ctx.atomicExpression, param);
      }

      throw new QueryLangException('Unreachable');
    }

    keywordExpression(ctx: KeywordExpressionCstChildren): OutputAst {
      const keyword = ctx.keyword[0]!.image as Exclude<
        Param['keyword'],
        undefined
      >;
      const expression = this.visit(ctx.atomicExpression, {
        keyword,
      });

      if (ctx.not) {
        return {
          type: 'NOT',
          operand: expression,
        };
      }

      return expression;
    }

    atomicExpression(
      ctx: AtomicExpressionCstChildren,
      param?: VisitorParam<TKeywords>,
    ): OutputAst {
      if (ctx.valueExpression) {
        const expression = this.visit(ctx.valueExpression, param);

        if (ctx.not) {
          return {
            type: 'NOT',
            operand: expression,
          };
        }

        return expression;
      }
      if (ctx.rangeExpression) {
        const expression = this.visit(ctx.rangeExpression, param);

        if (ctx.not) {
          return {
            type: 'NOT',
            operand: expression,
          };
        }

        return expression;
      }
      if (ctx.parenthesisExpression) {
        const expression = this.visit(ctx.parenthesisExpression, param);

        if (ctx.not) {
          return {
            type: 'NOT',
            operand: expression,
          };
        }

        return expression;
      }

      throw new QueryLangException('Unreachable');
    }

    parenthesisExpression(
      ctx: ParenthesisExpressionCstChildren,
      param?: Param,
    ): OutputAst {
      return this.visit(ctx.orExpression, param);
    }

    rangeExpression(ctx: RangeExpressionCstChildren, param?: Param): OutputAst {
      if (ctx.fullRange) {
        return this.visit(ctx.fullRange, param);
      }
      if (ctx.leftBoundedRange) {
        return this.visit(ctx.leftBoundedRange, param);
      }
      if (ctx.rightBoundedRange) {
        return this.visit(ctx.rightBoundedRange, param);
      }

      throw new QueryLangException('Unreachable');
    }

    private getValueFromToken(token: IQueryLangToken): string {
      if (matchesToken(token, Value, QuotedValue)) {
        return escapeString(token.image);
      } else {
        return token.image;
      }
    }

    leftBoundedRange(
      ctx: LeftBoundedRangeCstChildren,
      { keyword }: Param = {},
    ): OutputAst {
      const valueToken = ctx.value[0]!;
      const rangeToken = ctx.range[0]!;
      if (!keyword) {
        this.addError({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: rangeToken.endOffset,
          endLine: rangeToken.endLine,
          endColumn: rangeToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }
      if (matchesToken(valueToken, Null)) {
        this.addError({
          message: NULL_IS_INVALID_IN_RANGES,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      const value = this.getValueFromToken(valueToken);
      const { transform } = keywords[keyword].config;
      const res = transform(value);
      if (!res.ok) {
        this.addError({
          message: res.error.message,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      return {
        type: 'PREDICATE',
        keyword,
        op: {
          type: 'GTE',
          value: res.value,
        },
      } as any;
    }

    fullRange(ctx: FullRangeCstChildren, { keyword }: Param = {}): OutputAst {
      const lValueToken = ctx.lValue[0]!;
      const rValueToken = ctx.rValue[0]!;

      if (!keyword) {
        this.addError({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: lValueToken.startOffset,
          startLine: lValueToken.startLine,
          startColumn: lValueToken.startColumn,
          endOffset: rValueToken.endOffset,
          endLine: rValueToken.endLine,
          endColumn: rValueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      const isLValueNull = matchesToken(lValueToken, Null);
      if (isLValueNull) {
        this.addError({
          message: NULL_IS_INVALID_IN_RANGES,
          startOffset: lValueToken.startOffset,
          startLine: lValueToken.startLine,
          startColumn: lValueToken.startColumn,
          endOffset: lValueToken.endOffset,
          endLine: lValueToken.endLine,
          endColumn: lValueToken.endColumn,
        });
      }
      const isRValueNull = matchesToken(rValueToken, Null);
      if (isRValueNull) {
        this.addError({
          message: NULL_IS_INVALID_IN_RANGES,
          startOffset: rValueToken.startOffset,
          startLine: rValueToken.startLine,
          startColumn: rValueToken.startColumn,
          endOffset: rValueToken.endOffset,
          endLine: rValueToken.endLine,
          endColumn: rValueToken.endColumn,
        });
      }
      if (isLValueNull || isRValueNull) {
        return { type: 'AND', children: [] };
      }

      const lValue = this.getValueFromToken(lValueToken);
      const rValue = this.getValueFromToken(rValueToken);
      const { transform } = keywords[keyword].config;
      const lRes = transform(lValue);
      const rRes = transform(rValue);
      if (!lRes.ok) {
        this.addError({
          message: lRes.error.message,
          startOffset: lValueToken.startOffset,
          startLine: lValueToken.startLine,
          startColumn: lValueToken.startColumn,
          endOffset: lValueToken.endOffset,
          endLine: lValueToken.endLine,
          endColumn: lValueToken.endColumn,
        });
      }
      if (!rRes.ok) {
        this.addError({
          message: rRes.error.message,
          startOffset: rValueToken.startOffset,
          startLine: rValueToken.startLine,
          startColumn: rValueToken.startColumn,
          endOffset: rValueToken.endOffset,
          endLine: rValueToken.endLine,
          endColumn: rValueToken.endColumn,
        });
      }
      if (!lRes.ok || !rRes.ok) {
        return { type: 'AND', children: [] };
      }

      return {
        type: 'PREDICATE',
        keyword,
        op: {
          type: 'BETWEEN',
          min: lRes.value,
          max: rRes.value,
        },
      } as any;
    }

    rightBoundedRange(
      ctx: RightBoundedRangeCstChildren,
      { keyword }: Param = {},
    ): OutputAst {
      const rangeToken = ctx.range[0]!;
      const valueToken = ctx.value[0]!;
      if (!keyword) {
        this.addError({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: rangeToken.startOffset,
          startLine: rangeToken.startLine,
          startColumn: rangeToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      if (matchesToken(valueToken, Null)) {
        this.addError({
          message: NULL_IS_INVALID_IN_RANGES,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      const value = this.getValueFromToken(valueToken);
      const { transform } = keywords[keyword].config;
      const res = transform(value);
      if (!res.ok) {
        this.addError({
          message: res.error.message,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      return {
        type: 'PREDICATE',
        keyword,
        op: {
          type: 'LTE',
          value: res.value,
        },
      } as any;
    }

    private buildPredicateExpression(
      ctx: ValueExpressionCstChildren,
      {
        keyword,
        type,
        value,
      }: {
        keyword: string;
        type: DataType;
        value: KeywordDataType;
      },
    ): AnyPredicateExpression {
      let opType: AnyOpType = 'ILIKE';
      if (type === 'number') {
        opType = 'EQ';
      }

      let op: Op<{ [key: string]: KeywordDataType }, string> = {
        type: opType,
        value,
      } as any;

      if (ctx.eq) {
        op = { type: 'EQ', value } as any;
      } else if (ctx.tilde) {
        op = { type: 'LIKE', value } as any;
      } else if (ctx.gt) {
        op = { type: 'GT', value } as any;
      } else if (ctx.gte) {
        op = { type: 'GTE', value } as any;
      } else if (ctx.lt) {
        op = { type: 'LT', value } as any;
      } else if (ctx.lte) {
        op = { type: 'LTE', value } as any;
      }

      return {
        type: 'PREDICATE',
        keyword,
        op,
      };
    }

    private buildGlobalPredicate(ctx: ValueExpressionCstChildren): OutputAst {
      const valueToken = ctx.value[0]!;
      const children: AnyPredicateExpression[] = [];
      if (matchesToken(valueToken, Null)) {
        for (const kw of Object.keys(originalKeywords)) {
          children.push({
            type: 'PREDICATE',
            keyword: kw,
            op: {
              type: 'IS_NULL',
            },
          });
        }

        return { type: 'OR', children };
      }

      const value = this.getValueFromToken(valueToken);
      const modifier = (ctx.gt || ctx.lt || ctx.gte || ctx.lte) as
        | [IQueryLangToken, ...IQueryLangToken[]]
        | undefined;
      if (modifier) {
        const opToken = modifier[0];
        this.addError({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: opToken.startOffset,
          startLine: opToken.startLine,
          startColumn: opToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
      } else {
        for (const [kw, { config }] of Object.entries(originalKeywords)) {
          const res = config.transform(value);
          if (res.ok) {
            const expression = this.buildPredicateExpression(ctx, {
              keyword: kw,
              type: config.type,
              value: res.value,
            });
            children.push(expression);
          }
        }

        if (!children.length) {
          this.addError({
            message: "this value can't be used to search by any keywords",
            startOffset: valueToken.startOffset,
            startLine: valueToken.startLine,
            startColumn: valueToken.startColumn,
            endOffset: valueToken.endOffset,
            endLine: valueToken.endLine,
            endColumn: valueToken.endColumn,
          });
        }
      }

      return { type: 'OR', children };
    }

    valueExpression(
      ctx: ValueExpressionCstChildren,
      { keyword }: VisitorParam<TKeywords> = {},
    ): OutputAst {
      if (!keyword) {
        return this.buildGlobalPredicate(ctx);
      }

      const valueToken = ctx.value[0]!;
      if (matchesToken(valueToken, Null)) {
        return {
          type: 'PREDICATE',
          keyword,
          op: {
            type: 'IS_NULL',
          },
        };
      }

      const value = this.getValueFromToken(valueToken);
      const { transform, type: keywordType } = keywords[keyword].config;
      const res = transform(value);
      if (!res.ok) {
        this.addError({
          message: res.error.message,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      return this.buildPredicateExpression(ctx, {
        keyword,
        type: keywordType,
        value: res.value,
      });
    }
  }

  const cstVisitor = new QlCstVisitor();

  return {
    visit: (node) => {
      const ast = cstVisitor.visit(node);
      const errors = cstVisitor.getErrors();
      if (errors.length) {
        return {
          ast: { type: 'EMPTY' },
          errors: errors,
        };
      }

      return {
        ast: ast as QueryLangCstVisitorResult<TKeywords>['ast'],
        errors: [],
      };
    },
  };
}
