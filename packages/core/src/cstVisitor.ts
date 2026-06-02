import { type } from 'node:os';
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
  Ast,
  CreateKeywordInput,
  Expression,
  InferKeywordConfig,
  Op,
} from '@/types.js';

export type QueryLangCstVisitorResult<TKeywords extends CreateKeywordInput> = {
  errors: QueryLangCstVisitorError[];
  ast: Ast<InferKeywordConfig<TKeywords>>;
};

export type QueryLangCstVisitor<TKeywords extends CreateKeywordInput> = {
  visit: (node: CstNode) => QueryLangCstVisitorResult<TKeywords>;
};

export type QueryLangCstVisitorError = {
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
  type OutputAst = Expression<InferKeywordConfig<TKeywords>>;
  type Param = VisitorParam<TKeywords>;
  // const stringKeywords: Extract<TKeywords, {type: 'string'}>[];

  class QlCstVisitor
    extends parser.getBaseCstVisitorConstructor<
      VisitorParam<TKeywords>,
      OutputAst
    >()
    implements IQueryLangVisitor<Param, OutputAst>
  {
    public errors: QueryLangCstVisitorError[] = [];

    constructor() {
      super();
      this.validateVisitor();
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
      _ctx: KeywordOrAtomicExpressionCstChildren,
      param?: Param,
    ): OutputAst {
      return this.visit(_ctx.keywordExpression!);
    }

    keywordExpression(_ctx: KeywordExpressionCstChildren): OutputAst {
      return this.visit(_ctx.atomicExpression, {
        keyword: _ctx.keyword[0].image,
      });
    }

    atomicExpression(
      _ctx: AtomicExpressionCstChildren,
      param?: VisitorParam<TKeywords>,
    ): OutputAst {
      return this.visit(_ctx.valueExpression!, param);
    }

    parenthesisExpression(
      _ctx: ParenthesisExpressionCstChildren,
      param?: Param,
    ): OutputAst {
      return { type: 'EMPTY' };
    }

    rangeExpression(_ctx: RangeExpressionCstChildren): OutputAst {
      return { type: 'EMPTY' };
    }

    leftBoundedRange(_ctx: LeftBoundedRangeCstChildren): OutputAst {
      return { type: 'EMPTY' };
    }

    fullRange(_ctx: FullRangeCstChildren): OutputAst {
      return { type: 'EMPTY' };
    }

    rightBoundedRange(_ctx: RightBoundedRangeCstChildren): OutputAst {
      return { type: 'EMPTY' };
    }

    valueExpression(
      ctx: ValueExpressionCstChildren,
      { keyword }: VisitorParam<TKeywords> = {},
    ): OutputAst {
      if (!keyword) {
        return {
          type: 'OR',
          // fill with string keywords
          children: [],
        };
      }

      // biome-ignore lint/style/noNonNullAssertion: we will always have at least one token
      const { image } = ctx.anyValue[0]!;
      const { transform } = keywords[keyword].config;
      const res = transform(image);
      if (!res.ok) {
        // add error message here
        return {
          type: 'AND',
          children: [],
        };
      }

      const { value } = res;
      let op: {
        [K in typeof keyword]: Op<InferKeywordConfig<TKeywords>, K>;
      }[typeof keyword] = {
        op: 'ILIKE',
        value,
      };

      console.log(ctx);
      if (ctx.eq) {
        op = { op: 'EQ', value };
      } else if (ctx.tilde) {
        op = { op: 'LIKE', value };
      } else if (ctx.gt) {
        op = { op: 'GT', value };
      } else if (ctx.gte) {
        op = { op: 'GTE', value };
      } else if (ctx.lt) {
        op = { op: 'LT', value };
      } else if (ctx.lte) {
        op = { op: 'LTE', value };
      }

      return {
        type: 'KEYWORD',
        keyword,
        value: op,
      };
    }
  }

  const cstVisitor = new QlCstVisitor();

  return {
    visit: (node) => {
      const ast = cstVisitor.visit(node);
      return {
        ast,
        errors: cstVisitor.errors,
      };
    },
  };
}
