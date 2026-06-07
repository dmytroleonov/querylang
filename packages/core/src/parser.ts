import {
  type CstNode,
  CstParser,
  EOF,
  type IRecognitionException,
  type IToken,
  type TokenType,
} from 'chevrotain';
import {
  And,
  Colon,
  Eq,
  Gt,
  Gte,
  Keyword,
  LParen,
  Lt,
  Lte,
  NonNullValue,
  Not,
  Null,
  Or,
  Range,
  RParen,
  Tilde,
  Whitespace,
} from '@/builtin.js';
import { createChevrotainCstVisitor } from '@/cstVisitor.js';
import { createChevrotainLexer, createLanguage } from '@/lexer.js';
import type {
  Ast,
  CreateKeywordInput,
  InferKeywordConfig,
  QueryLangError,
} from '@/types.js';
import { matchesToken } from '@/utils.js';

export type ChevrotainParserResult = {
  node: CstNode;
  errors: QueryLangError[];
};

export type ChevrotainParser = {
  instance: InternalQlParser;
  parse: (input: IToken[]) => ChevrotainParserResult;
};

type ParsingStepConfig = {
  isGlobal?: boolean;
};

export class InternalQlParser extends CstParser {
  constructor(tokens: TokenType[]) {
    super(tokens);
    this.performSelfAnalysis();
  }

  public orExpression = this.RULE(
    'orExpression',
    ({ isGlobal = true }: ParsingStepConfig = {}) => {
      this.SUBRULE(this.andExpression, { ARGS: [{ isGlobal }] });
      this.MANY(() => {
        this.CONSUME(Or);
        this.OPTION(() => {
          this.CONSUME(Whitespace);
        });
        this.SUBRULE2(this.andExpression, {
          ARGS: [{ isGlobal }],
        });
      });
    },
  );

  private andExpression = this.RULE(
    'andExpression',
    (config?: ParsingStepConfig) => {
      this.SUBRULE(this.keywordOrAtomicExpression, { ARGS: [config] });
      this.MANY(() => {
        this.OPTION({ DEF: () => this.CONSUME(And) });
        this.OPTION1(() => {
          this.CONSUME(Whitespace);
        });
        this.SUBRULE2(this.keywordOrAtomicExpression, { ARGS: [config] });
      });
    },
  );

  private keywordOrAtomicExpression = this.RULE(
    'keywordOrAtomicExpression',
    (config?: ParsingStepConfig) => {
      this.OPTION(() => {
        this.CONSUME(Whitespace);
      });
      this.OR([
        {
          GATE: () => !!config?.isGlobal,
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
    this.SUBRULE(this.atomicExpression, { ARGS: [{ isGlobal: false }] });
  });

  private atomicExpression = this.RULE(
    'atomicExpression',
    (config?: ParsingStepConfig) => {
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
            this.SUBRULE(this.valueExpression);
          },
        },
      ]);
      // make ws always optional?
      this.OR2([
        {
          GATE: () => this.isWhitespaceRequired(),
          ALT: () => this.CONSUME(Whitespace),
        },
        {
          GATE: () => !this.isWhitespaceRequired(),
          ALT: () =>
            this.OPTION1(() => {
              this.CONSUME1(Whitespace);
            }),
        },
      ]);
    },
  );

  private isWhitespaceRequired(): boolean {
    const nextToken = this.LA(1);
    return !matchesToken(nextToken, EOF, LParen, RParen, And, Or);
  }

  private parenthesisExpression = this.RULE(
    'parenthesisExpression',
    (config?: ParsingStepConfig) => {
      this.CONSUME(LParen);
      this.SUBRULE(this.orExpression, { ARGS: [config] });
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
    this.CONSUME(NonNullValue, { LABEL: 'value' });
  });

  private fullRange = this.RULE('fullRange', () => {
    this.CONSUME(NonNullValue, { LABEL: 'lValue' });
    this.CONSUME(Range);
    this.CONSUME1(NonNullValue, { LABEL: 'rValue' });
  });

  private leftBoundedRange = this.RULE('leftBoundedRange', () => {
    this.CONSUME(NonNullValue, { LABEL: 'value' });
    this.CONSUME(Range);
  });

  private valueExpression = this.RULE('valueExpression', () => {
    this.OR([
      {
        ALT: () => {
          this.OPTION({ DEF: () => this.CONSUME(Eq) });
          this.CONSUME(Null);
        },
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
                { ALT: () => this.CONSUME1(Eq) },
                { ALT: () => this.CONSUME(Tilde) },
              ]);
            },
          });
          this.CONSUME(NonNullValue, { LABEL: 'value' });
        },
      },
    ]);
  });
}

export function createChevrotainParser(tokens: TokenType[]): ChevrotainParser {
  const parser = new InternalQlParser(tokens);

  return {
    instance: parser,
    parse: (input) => {
      parser.input = input;
      const node = parser.orExpression();
      const errors = parser.errors.map(parsingErrorToQueryLangError);

      return { node, errors };
    },
  };
}

export type ParserResult<TKeywords extends CreateKeywordInput> = {
  ast: Ast<InferKeywordConfig<TKeywords>>;
  errors: QueryLangError[];
};

export type QlParser<TKeywords extends CreateKeywordInput> = {
  parse: (input: string) => ParserResult<TKeywords>;
};

function parsingErrorToQueryLangError(
  error: IRecognitionException,
): QueryLangError {
  const { token } = error;
  return {
    message: `unexpected token ->${token.image}<-`,
    startOffset: token.startOffset,
    startLine: token.startLine!,
    startColumn: token.startColumn!,
    endOffset: token.endOffset!,
    endLine: token.endLine!,
    endColumn: token.endColumn!,
  };
}

export function createQlParser<TKeywords extends CreateKeywordInput>(
  keywords: TKeywords,
): QlParser<TKeywords> {
  const language = createLanguage(keywords);
  const lexer = createChevrotainLexer(language.tokens);
  const parser = createChevrotainParser(language.tokens);
  const cstVisitor = createChevrotainCstVisitor(
    language.keywords,
    parser.instance,
  );

  return {
    parse: (input: string): ParserResult<TKeywords> => {
      const { tokens, errors: lexerErrors } = lexer.tokenize(input);
      if (lexerErrors.length) {
        return {
          ast: { type: 'EMPTY' },
          errors: lexerErrors,
        };
      }

      const { node, errors: parserErrors } = parser.parse(tokens);
      if (parserErrors.length) {
        return {
          ast: { type: 'EMPTY' },
          errors: parserErrors,
        };
      }

      const { errors: cstVisitorErrors, ast } = cstVisitor.visit(node);
      if (cstVisitorErrors.length) {
        return {
          ast: { type: 'EMPTY' },
          errors: cstVisitorErrors,
        };
      }

      return {
        ast,
        errors: [],
      };
    },
  };
}
