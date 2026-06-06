import { type CstNode, tokenMatcher } from 'chevrotain';
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
} from '@/types.js';
import { QuotedValue, Value } from './builtin.js';
import { QueryLangError } from './erorr.js';
import { escapeString } from './utils.js';

export type QueryLangCstVisitorResult<TKeywords extends CreateKeywordInput> = {
  errors: QueryLangCstVisitorError[];
  ast: Ast<InferKeywordConfig<TKeywords>>;
};

export type QueryLangCstVisitor<TKeywords extends CreateKeywordInput> = {
  visit: (node: CstNode) => QueryLangCstVisitorResult<TKeywords>;
};

const ALLOWED_GLOBAL_SEARCHES =
  'global searches are only allowed with "~" and "="';

export type QueryLangCstVisitorError = {
  startOffset: number;
  startLine: number;
  startColumn: number;
  endOffset: number;
  endLine: number;
  endColumn: number;
  message: string;
};

export type VisitorParam<TKeywords extends CreateKeywordInput> = {
  keyword?: Extract<keyof TKeywords, string>;
};

// TODO: handle null values

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
    private errors: QueryLangCstVisitorError[] = [];

    constructor() {
      super();
      this.validateVisitor();
    }

    private addError(error: QueryLangCstVisitorError): void {
      this.errors.push(error);
    }

    public getErrors(): QueryLangCstVisitorError[] {
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

      throw new QueryLangError('Unreachable');
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

      throw new QueryLangError('Unreachable');
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

      throw new QueryLangError('Unreachable');
    }

    private getValueFromToken(token: IQueryLangToken): string {
      if (tokenMatcher(token, Value) || tokenMatcher(token, QuotedValue)) {
        return escapeString(token.image);
      } else {
        return token.image;
      }
    }

    leftBoundedRange(
      ctx: LeftBoundedRangeCstChildren,
      { keyword }: Param = {},
    ): OutputAst {
      const valueToken = ctx.anyValue[0]!;
      const {
        startOffset: valueStartOffset,
        startLine: valueStartLine,
        startColumn: valueStartColumn,
        endOffset: valueEndOffset,
        endLine: valueEndLine,
        endColumn: valueEndColumn,
      } = valueToken;
      const {
        endOffset: rangeEndOffset,
        endLine: rangeEndLine,
        endColumn: rangeEndColumn,
      } = ctx.range[0]!;
      if (!keyword) {
        this.addError({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: valueStartOffset,
          startLine: valueStartLine,
          startColumn: valueStartColumn,
          endOffset: rangeEndOffset,
          endLine: rangeEndLine,
          endColumn: rangeEndColumn,
        });
        return { type: 'AND', children: [] };
      }

      const value = this.getValueFromToken(valueToken);
      const { transform } = keywords[keyword].config;
      const res = transform(value);
      if (!res.ok) {
        this.addError({
          message: res.error.message,
          startOffset: valueStartOffset,
          startLine: valueStartLine,
          startColumn: valueStartColumn,
          endOffset: valueEndOffset,
          endLine: valueEndLine,
          endColumn: valueEndColumn,
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
      };
    }

    fullRange(ctx: FullRangeCstChildren, { keyword }: Param = {}): OutputAst {
      const lValueToken = ctx.anyValue[0]!;
      const {
        startOffset: lStartOffset,
        startLine: lStartLine,
        startColumn: lStartColumn,
        endOffset: lEndOffset,
        endLine: lEndLine,
        endColumn: lEndColumn,
      } = lValueToken;
      const rValueToken = ctx.anyValue[0]!;
      const {
        startOffset: rStartOffset,
        startLine: rStartLine,
        startColumn: rStartColumn,
        endOffset: rEndOffset,
        endLine: rEndLine,
        endColumn: rEndColumn,
      } = rValueToken;

      if (!keyword) {
        this.addError({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: lStartOffset,
          startLine: lStartLine,
          startColumn: lStartColumn,
          endOffset: rEndOffset,
          endLine: rEndLine,
          endColumn: rEndColumn,
        });
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
          startOffset: lStartOffset,
          startLine: lStartLine,
          startColumn: lStartColumn,
          endOffset: lEndOffset,
          endLine: lEndLine,
          endColumn: lEndColumn,
        });
      }
      if (!rRes.ok) {
        this.addError({
          message: rRes.error.message,
          startOffset: rStartOffset,
          startLine: rStartLine,
          startColumn: rStartColumn,
          endOffset: rEndOffset,
          endLine: rEndLine,
          endColumn: rEndColumn,
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
      };
    }

    rightBoundedRange(
      ctx: RightBoundedRangeCstChildren,
      { keyword }: Param = {},
    ): OutputAst {
      const {
        startOffset: rangeStartOffset,
        startLine: rangeStartLine,
        startColumn: rangeStartColumn,
      } = ctx.range[0]!;
      const valueToken = ctx.anyValue[0]!;
      const {
        startOffset: valueStartOffset,
        startLine: valueStartLine,
        startColumn: valueStartColumn,
        endOffset: valueEndOffset,
        endLine: valueEndLine,
        endColumn: valueEndColumn,
      } = valueToken;
      if (!keyword) {
        this.addError({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: rangeStartOffset,
          startLine: rangeStartLine,
          startColumn: rangeStartColumn,
          endOffset: valueEndOffset,
          endLine: valueEndLine,
          endColumn: valueEndColumn,
        });
        return { type: 'AND', children: [] };
      }

      const value = this.getValueFromToken(valueToken);
      const { transform } = keywords[keyword].config;
      const res = transform(value);
      if (!res.ok) {
        this.addError({
          message: res.error.message,
          startOffset: valueStartOffset,
          startLine: valueStartLine,
          startColumn: valueStartColumn,
          endOffset: valueEndOffset,
          endLine: valueEndLine,
          endColumn: valueEndColumn,
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
      };
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
      };

      if (ctx.eq) {
        op = { type: 'EQ', value };
      } else if (ctx.tilde) {
        op = { type: 'LIKE', value };
      } else if (ctx.gt) {
        op = { type: 'GT', value };
      } else if (ctx.gte) {
        op = { type: 'GTE', value };
      } else if (ctx.lt) {
        op = { type: 'LT', value };
      } else if (ctx.lte) {
        op = { type: 'LTE', value };
      }

      return {
        type: 'PREDICATE',
        keyword,
        op,
      };
    }

    valueExpression(
      ctx: ValueExpressionCstChildren,
      { keyword }: VisitorParam<TKeywords> = {},
    ): OutputAst {
      const valueToken = ctx.anyValue[0]!;
      const {
        startOffset: valueStartOffset,
        startLine: valueStartLine,
        startColumn: valueStartColumn,
        endOffset: valueEndOffset,
        endLine: valueEndLine,
        endColumn: valueEndColumn,
      } = valueToken;
      const value = this.getValueFromToken(valueToken);
      if (!keyword) {
        const children: AnyPredicateExpression[] = [];
        const tokens = (ctx.gt || ctx.lt || ctx.gte || ctx.lte) as
          | [IQueryLangToken, ...IQueryLangToken[]]
          | undefined;
        if (tokens) {
          const {
            startOffset: opStartOffset,
            startLine: opStartLine,
            startColumn: opStartColumn,
          } = tokens[0];
          this.addError({
            message: ALLOWED_GLOBAL_SEARCHES,
            startOffset: opStartOffset,
            startLine: opStartLine,
            startColumn: opStartColumn,
            endOffset: valueEndOffset,
            endLine: valueEndLine,
            endColumn: valueEndColumn,
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
              startOffset: valueStartOffset,
              startLine: valueStartLine,
              startColumn: valueStartColumn,
              endOffset: valueEndOffset,
              endLine: valueEndLine,
              endColumn: valueEndColumn,
            });
          }
        }

        return { type: 'OR', children };
      }

      const { transform, type: keywordType } = keywords[keyword].config;
      const res = transform(value);
      if (!res.ok) {
        this.addError({
          message: res.error.message,
          startOffset: valueStartOffset,
          startLine: valueStartLine,
          startColumn: valueStartColumn,
          endOffset: valueEndOffset,
          endLine: valueEndLine,
          endColumn: valueEndColumn,
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
