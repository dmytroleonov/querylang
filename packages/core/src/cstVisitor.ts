import type { CstNode } from 'chevrotain';
import type { QlParser } from '@/parser.js';
import type { Ast, TKeywordConfig } from '@/types.js';

export type QueryLangCstVisitor<TConfig extends TKeywordConfig> = {
  visit: (node: CstNode) => Ast<TConfig>;
};

export function createCstVisitor<TConfig extends TKeywordConfig>(
  parser: QlParser,
): QueryLangCstVisitor<TConfig> {
  class QlCstVisitor extends parser.getBaseCstVisitorConstructor<
    never,
    Ast<TConfig>
  >() {
    constructor() {
      super();
      this.validateVisitor();
    }
  }
  const cstVisitor = new QlCstVisitor();

  return {
    visit: (node: CstNode): Ast<TConfig> => {
      return cstVisitor.visit(node);
    },
  };
}
