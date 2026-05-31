import {
  type CstNode,
  CstParser,
  EOF,
  type IRecognitionException,
  type IToken,
  tokenMatcher,
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
  Whitespace,
} from '@/builtin.js';
import type { Language } from '@/lexer.js';
import type { CreateKeywordInput } from '@/types.js';

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

    private optionalWhitespace = this.RULE('optionalWhitespace', () => {
      this.OPTION(() => {
        this.CONSUME(Whitespace);
      });
    });

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
        this.SUBRULE(this.optionalWhitespace);
        this.SUBRULE2(this.andExpression, { ARGS: [config] });
      });
    });

    private andExpression = this.RULE('andExpression', (config?: Config) => {
      this.SUBRULE(this.keywordOrAtomicExpression, { ARGS: [config] });
      this.MANY(() => {
        this.OPTION({ DEF: () => this.CONSUME(And) });
        this.SUBRULE(this.optionalWhitespace);
        this.SUBRULE2(this.keywordOrAtomicExpression, { ARGS: [config] });
      });
    });

    private keywordOrAtomicExpression = this.RULE(
      'keywordOrAtomicExpression',
      (config?: Config) => {
        this.SUBRULE(this.optionalWhitespace);
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
        this.OR2([
          {
            GATE: () => this.isWhitespaceRequired(),
            ALT: () => this.CONSUME(Whitespace),
          },
          {
            GATE: () => !this.isWhitespaceRequired(),
            ALT: () => this.SUBRULE1(this.optionalWhitespace),
          },
        ]);
      },
    );

    private isWhitespaceRequired(): boolean {
      const wsNotRequiredBefore = [EOF, LParen, RParen, And, Or];
      const nextToken = this.LA(1);
      return !wsNotRequiredBefore.some((t) => tokenMatcher(nextToken, t));
    }

    private parenthesisExpression = this.RULE(
      'parenthesisExpression',
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

type LRangeOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'L_RANGE';
  min: TConfig[TKeyword];
};

type RRangeOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'R_RANGE';
  max: TConfig[TKeyword];
};

type FullRangeOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'FULL_RANGE';
  min: TConfig[TKeyword];
  max: TConfig[TKeyword];
};

type EqOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> = {
  op: 'EQ';
  value: TConfig[TKeyword];
};

type LtOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> = {
  op: 'LT';
  value: TConfig[TKeyword];
};

type LteOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> = {
  op: 'LTE';
  value: TConfig[TKeyword];
};

type GtOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> = {
  op: 'GT';
  value: TConfig[TKeyword];
};

type GteOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> = {
  op: 'GTE';
  value: TConfig[TKeyword];
};

type ILikeOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> = {
  op: 'ILIKE';
  value: TConfig[TKeyword];
};

type LikeOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> = {
  op: 'LIKE';
  value: TConfig[TKeyword];
};

type StringOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> =
  | ILikeOp<TConfig, TKeyword>
  | LikeOp<TConfig, TKeyword>
  | EqOp<TConfig, TKeyword>;

type NumberOp<TConfig extends TKeywordConfig, TKeyword extends keyof TConfig> =
  | LRangeOp<TConfig, TKeyword>
  | RRangeOp<TConfig, TKeyword>
  | FullRangeOp<TConfig, TKeyword>
  | EqOp<TConfig, TKeyword>
  | LtOp<TConfig, TKeyword>
  | LteOp<TConfig, TKeyword>
  | GtOp<TConfig, TKeyword>
  | GteOp<TConfig, TKeyword>;

type BooleanOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = EqOp<TConfig, TKeyword>;

type Op<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = TConfig[TKeyword] extends string
  ? StringOp<TConfig, TKeyword>
  : TConfig[TKeyword] extends number
    ? NumberOp<TConfig, TKeyword>
    : TConfig[TKeyword] extends boolean
      ? BooleanOp<TConfig, TKeyword>
      : never;

type KeywordExpression<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  type: 'KEYWORD';
} & { [K in TKeyword]: { keyword: K; value: Op<TConfig, K> } }[TKeyword];

type AndExpression<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  type: 'AND';
  children: Expression<TConfig, TKeyword>[];
};

type OrExpression<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  type: 'OR';
  children: Expression<TConfig, TKeyword>[];
};

type TKeywordConfig = Record<string, number | string | boolean>;

type Expression<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig = keyof TConfig,
> =
  | OrExpression<TConfig, TKeyword>
  | AndExpression<TConfig, TKeyword>
  | KeywordExpression<TConfig, TKeyword>;

type Empty = { type: 'EMPTY' };

export type Ast<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig = keyof TConfig,
> = Expression<TConfig, TKeyword> | Empty;
