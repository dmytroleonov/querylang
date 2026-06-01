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
import type { Ast, CreateKeywordInput, InferKeywordConfig } from '@/types.js';

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

export function createChevrotainCstVisitor<
  TKeywords extends CreateKeywordInput,
>(
  _keywords: CreatedKeywords<TKeywords>,
  parser: InternalQlParser,
): QueryLangCstVisitor<TKeywords> {
  type OutputAst = Ast<InferKeywordConfig<TKeywords>>;

  class QlCstVisitor
    extends parser.getBaseCstVisitorConstructor<never, OutputAst>()
    implements IQueryLangVisitor<never, OutputAst>
  {
    public errors: QueryLangCstVisitorError[] = [];

    constructor() {
      super();
      this.validateVisitor();
    }

    orExpression(_ctx: OrExpressionCstChildren): OutputAst {
      return { type: 'EMPTY' };
    }

    andExpression(_ctx: AndExpressionCstChildren): OutputAst {
      return { type: 'EMPTY' };
    }

    keywordOrAtomicExpression(
      _ctx: KeywordOrAtomicExpressionCstChildren,
    ): OutputAst {
      return { type: 'EMPTY' };
    }

    keywordExpression(_ctx: KeywordExpressionCstChildren): OutputAst {
      return { type: 'EMPTY' };
    }

    atomicExpression(_ctx: AtomicExpressionCstChildren): OutputAst {
      return { type: 'EMPTY' };
    }

    parenthesisExpression(_ctx: ParenthesisExpressionCstChildren): OutputAst {
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

    valueExpression(_ctx: ValueExpressionCstChildren): OutputAst {
      return { type: 'EMPTY' };
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
