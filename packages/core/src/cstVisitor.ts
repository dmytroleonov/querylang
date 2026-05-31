import type { CstNode } from 'chevrotain';
import type { QueryLangParser } from '@/parser.js';
import type { Ast, TKeywordConfig } from '@/types.js';

export type QueryLangCstVisitor<TConfig extends TKeywordConfig> = {
  visit: (node: CstNode) => Ast<TConfig>;
};

export function createCstVisitor<TConfig extends TKeywordConfig>(
  parser: QueryLangParser,
): QueryLangCstVisitor<TConfig> {
  class CstVisitor extends parser.getBaseCstVisitorConstructor<
    never,
    Ast<TConfig>
  >() {
    constructor() {
      super();
      this.validateVisitor();
    }
  }
  const cstVisitor = new CstVisitor();

  return {
    visit: (node: CstNode): Ast<TConfig> => {
      return cstVisitor.visit(node);
    },
  };
}
