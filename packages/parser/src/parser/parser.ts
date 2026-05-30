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

type Config = {
  allowKeywords?: boolean;
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

    public expression = this.RULE(
      'expression',
      ({ allowKeywords = true }: Config = {}) => {
        this.SUBRULE(this.orExpression, { ARGS: [{ allowKeywords }] });
      },
    );

    private orExpression = this.RULE('orExpression', (config?: Config) => {
      this.SUBRULE(this.andExpression, { ARGS: [config] });
      this.MANY(() => {
        this.CONSUME(Or);
        this.SUBRULE2(this.andExpression, { ARGS: [config] });
      });
    });

    private andExpression = this.RULE('andExpression', (config?: Config) => {
      this.SUBRULE(this.keywordOrAtomicExpression, { ARGS: [config] });
      this.MANY(() => {
        this.OPTION({ DEF: () => this.CONSUME(And) });
        this.SUBRULE2(this.keywordOrAtomicExpression, { ARGS: [config] });
      });
    });

    private keywordOrAtomicExpression = this.RULE(
      'keywordOrAtomicExpression',
      (config?: Config) => {
        this.OR([
          {
            GATE: () => !!config?.allowKeywords,
            ALT: () => this.SUBRULE(this.keywordExpression),
          },
          {
            ALT: () => this.SUBRULE(this.atomicExpression, { ARGS: [config] }),
          },
        ]);
      },
    );

    private keywordExpression = this.RULE('keywordExpression', () => {
      this.OPTION({
        DEF: () => this.CONSUME(Not),
      });
      this.CONSUME(Keyword);
      this.CONSUME(Colon);
      this.SUBRULE(this.atomicExpression, { ARGS: [{ allowKeywords: false }] });
    });

    private atomicExpression = this.RULE(
      'atomicExpression',
      (config?: Config) => {
        this.OPTION({
          DEF: () => this.CONSUME(Not),
        });
        this.OR([
          {
            ALT: () =>
              this.SUBRULE(this.parenthesisExpression, {
                ARGS: [config],
              }),
          },
          {
            GATE: () =>
              this.LA(1).tokenType === Range || this.LA(2).tokenType === Range,
            ALT: () => this.SUBRULE(this.rangeExpression),
          },
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
        ]);
      },
    );

    private parenthesisExpression = this.RULE(
      'parenthesisValueExpression',
      (config?: Config) => {
        this.CONSUME(LParen);
        this.SUBRULE(this.expression, { ARGS: [config] });
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
