import {
  type CstNode,
  CstParser,
  type IRecognitionException,
  type IToken,
} from 'chevrotain';
import {
  And,
  AnyValue,
  Colon,
  Eq,
  Gt,
  Gte,
  Keyword,
  LParen,
  Lt,
  Lte,
  Not,
  Or,
  Range,
  RParen,
  Tilde,
} from '@/keywords/builtin.js';
import type { CreateKeywordInput } from '@/keywords/types.js';
import type { Language } from '@/lexer/lexer.js';

export type ParserResult = {
  node: CstNode;
  errors: IRecognitionException[];
};

export type CustomParser = {
  parse: (input: IToken[]) => ParserResult;
};

export function createParser<TKeywords extends CreateKeywordInput>(
  language: Language<TKeywords>,
): CustomParser {
  const { tokens } = language;
  class Parser extends CstParser {
    constructor() {
      super(tokens);
      this.performSelfAnalysis();
    }

    public expression = this.RULE('expression', () => {
      this.SUBRULE(this.orExpression);
    });

    private orExpression = this.RULE('orExpression', () => {
      this.SUBRULE(this.andExpression);
      this.MANY(() => {
        this.CONSUME(Or);
        this.SUBRULE2(this.andExpression);
      });
    });

    private andExpression = this.RULE('andExpression', () => {
      this.SUBRULE(this.keywordOrAtomicExpression);
      this.MANY(() => {
        this.OPTION({ DEF: () => this.CONSUME(And) });
        this.SUBRULE2(this.keywordOrAtomicExpression);
      });
    });

    private keywordOrAtomicExpression = this.RULE(
      'keywordOrAtomicExpression',
      () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.keywordExpression) },
          { ALT: () => this.SUBRULE(this.atomicExpression) },
        ]);
      },
    );

    private keywordExpression = this.RULE('keywordExpression', () => {
      this.OPTION({
        DEF: () => this.CONSUME(Not),
      });
      this.CONSUME(Keyword);
      this.CONSUME(Colon);
      this.SUBRULE(this.atomicExpression);
    });

    private atomicExpression = this.RULE('atomicExpression', () => {
      this.OPTION({
        DEF: () => this.CONSUME(Not),
      });
      this.OR([
        { ALT: () => this.SUBRULE(this.parenthesisExpression) },
        {
          ALT: () => {
            this.OPTION1({
              DEF: () => {
                this.OR1([
                  { ALT: () => this.CONSUME(Gte) },
                  { ALT: () => this.CONSUME(Gt) },
                  { ALT: () => this.CONSUME(Lte) },
                  { ALT: () => this.CONSUME(Lt) },
                  { ALT: () => this.CONSUME(Eq) },
                  { ALT: () => this.CONSUME(Tilde) },
                ]);
              },
            });
            this.CONSUME(AnyValue);
          },
        },
        {
          GATE: () =>
            this.LA(1).tokenType === Range || this.LA(2).tokenType === Range,
          ALT: () => this.SUBRULE(this.rangeExpression),
        },
      ]);
    });

    private parenthesisExpression = this.RULE(
      'parenthesisValueExpression',
      () => {
        this.CONSUME(LParen);
        this.SUBRULE(this.expression);
        this.CONSUME(RParen);
      },
    );

    private rangeExpression = this.RULE('rangeExpression', () => {
      this.OR([
        { ALT: () => this.SUBRULE(this.fullRange) },
        { ALT: () => this.SUBRULE(this.rightBoundedRange) },
        { ALT: () => this.SUBRULE(this.leftBoundedRange) },
      ]);
    });

    private rightBoundedRange = this.RULE('rightBoundedRange', () => {
      this.CONSUME(Range);
      this.CONSUME(AnyValue);
    });

    private fullRange = this.RULE('fullRange', () => {
      this.CONSUME(AnyValue);
      this.CONSUME(Range);
      this.CONSUME1(AnyValue);
    });

    private leftBoundedRange = this.RULE('leftBoundedRange', () => {
      this.CONSUME(AnyValue);
      this.CONSUME(Range);
    });
  }

  const parser = new Parser();

  return {
    parse: (input) => {
      parser.input = input;
      return { node: parser.expression(), errors: parser.errors };
    },
  };
}
