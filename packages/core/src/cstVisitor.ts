import type { CstNode } from 'chevrotain';
import type { CreatedKeywords } from '@/createKeywords.js';
import type {
  AndExpressionCstChildren,
  AtomicExpressionCstChildren,
  FullRangeCstChildren,
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
  AnyKeywordExpression,
  AnyOpType,
  Ast,
  CreateKeywordInput,
  DataType,
  Expression,
  InferKeywordConfig,
  KeywordDataType,
  Op,
} from '@/types.js';
import { QueryLangError } from './erorr.js';

export type QueryLangCstVisitorResult<TKeywords extends CreateKeywordInput> = {
  errors: QueryLangCstVisitorError[];
  ast: Ast<InferKeywordConfig<TKeywords>>;
};

export type QueryLangCstVisitor<TKeywords extends CreateKeywordInput> = {
  visit: (node: CstNode) => QueryLangCstVisitorResult<TKeywords>;
};

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

      // TODO: don't throw?
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

    leftBoundedRange(
      ctx: LeftBoundedRangeCstChildren,
      { keyword }: Param = {},
    ): OutputAst {
      if (!keyword) {
        // TODO: searcy by all valid keywords
        return {
          type: 'AND',
          children: [],
        };
      }
      const { transform } = keywords[keyword].config;
      const value = ctx.anyValue[0]!.image;
      const res = transform(value);
      if (!res.ok) {
        // TODO: add error message here
        return {
          type: 'AND',
          children: [],
        };
      }

      return {
        type: 'KEYWORD',
        keyword,
        op: {
          type: 'GTE',
          value: res.value,
        },
      };
    }

    fullRange(ctx: FullRangeCstChildren, { keyword }: Param = {}): OutputAst {
      if (!keyword) {
        // TODO: searcy by all valid keywords
        return {
          type: 'AND',
          children: [],
        };
      }
      const { transform } = keywords[keyword].config;
      const lValue = ctx.anyValue[0]!.image;
      const rValue = ctx.anyValue[1]!.image;
      const lRes = transform(lValue);
      const rRes = transform(rValue);
      if (!lRes.ok || !rRes.ok) {
        // TODO: add error message here
        return {
          type: 'AND',
          children: [],
        };
      }

      return {
        type: 'KEYWORD',
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
      if (!keyword) {
        // TODO: searcy by all valid keywords
        return {
          type: 'AND',
          children: [],
        };
      }
      const { transform } = keywords[keyword].config;
      const value = ctx.anyValue[0]!.image;
      const res = transform(value);
      if (!res.ok) {
        // TODO: add error message here
        return {
          type: 'AND',
          children: [],
        };
      }

      return {
        type: 'KEYWORD',
        keyword,
        op: {
          type: 'LTE',
          value: res.value,
        },
      };
    }

    private buildKeywordExpression(
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
    ): AnyKeywordExpression {
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
        type: 'KEYWORD',
        keyword,
        op,
      };
    }

    valueExpression(
      ctx: ValueExpressionCstChildren,
      { keyword }: VisitorParam<TKeywords> = {},
    ): OutputAst {
      const {
        image,
        startOffset,
        startLine,
        startColumn,
        endOffset,
        endLine,
        endColumn,
      } = ctx.anyValue[0]!;
      if (!keyword) {
        const children: AnyKeywordExpression[] = [];
        for (const [kw, { config }] of Object.entries(originalKeywords)) {
          const res = config.transform(image);
          if (res.ok) {
            const expression = this.buildKeywordExpression(ctx, {
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
            startOffset,
            startLine,
            startColumn,
            endOffset,
            endLine,
            endColumn,
          });
        }

        return {
          type: 'OR',
          children,
        };
      }

      const { transform, type: keywordType } = keywords[keyword].config;
      const res = transform(image);
      if (!res.ok) {
        this.addError({
          message: res.error.message,
          startOffset,
          startLine,
          startColumn,
          endOffset,
          endLine,
          endColumn,
        });
        return {
          type: 'AND',
          children: [],
        };
      }

      return this.buildKeywordExpression(ctx, {
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
