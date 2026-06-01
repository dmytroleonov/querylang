import type { CstNode } from 'chevrotain';
import type { InternalQlParser } from '@/parser.js';
import type { Ast, CreateKeywordInput, InferKeywordConfig } from '@/types.js';
import type { CreatedKeywords } from './createKeywords.js';

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
  class QlCstVisitor extends parser.getBaseCstVisitorConstructor<
    never,
    Ast<InferKeywordConfig<TKeywords>>
  >() {
    public errors: QueryLangCstVisitorError[] = [];

    constructor() {
      super();
      this.validateVisitor();
    }

    orExpression() {}
    andExpression() {}
    keywordOrAtomicExpression() {}
    keywordExpression() {}
    atomicExpression() {}
    parenthesisExpression() {}
    rangeExpression() {}
    leftBoundedRange() {}
    fullRange() {}
    rightBoundedRange() {}
    optionalWhitespace() {}
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
