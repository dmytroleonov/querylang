// biome-ignore-all lint/suspicious/noExplicitAny: todo better types
import type { CstNode } from 'chevrotain';
import {
  BooleanValue,
  Eq,
  Null,
  NumberValue,
  StringValue,
  Tilde,
} from '@/builtin.js';
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
import { QueryLangException } from '@/erorr.js';
import type { InternalQlParser } from '@/parser.js';
import type {
  AnyKeyword,
  Ast,
  CreateKeywordInput,
  DataType,
  Expression,
  InferKeywordConfig,
  KeywordDataType,
  QueryLangError,
} from '@/types.js';
import {
  buildKeywordPredicateExpression,
  getValueFromToken,
  isValidTokenWithModifier,
  matchesToken,
} from '@/utils.js';

export type QueryLangCstVisitorResult<TKeywords extends CreateKeywordInput> = {
  errors: QueryLangError[];
  ast: Ast<InferKeywordConfig<TKeywords>>;
};

export type QueryLangCstVisitor<TKeywords extends CreateKeywordInput> = {
  visit: (node: CstNode) => QueryLangCstVisitorResult<TKeywords>;
};

const ALLOWED_GLOBAL_SEARCHES = 'global range searches are not allowed';
const NULL_IS_INVALID_IN_RANGES =
  '->null<- cannot be used in range lookups. Wrap it in single or double quotes \
to perform a string lookup';

export type VisitorParam<
  TKeywords extends CreateKeywordInput,
  TCreatedKeywords extends CreatedKeywords<TKeywords>,
> = {
  keyword?: Extract<keyof TCreatedKeywords, string>;
};

export function createChevrotainCstVisitor<
  TKeywords extends CreateKeywordInput,
  TCreatedKeywords extends CreatedKeywords<TKeywords>,
>(
  keywords: TCreatedKeywords,
  parser: InternalQlParser,
): QueryLangCstVisitor<TKeywords> {
  type OutputAst = Expression<{ [x: string]: KeywordDataType }>;
  type Param = VisitorParam<TKeywords, TCreatedKeywords>;
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
    private errors: QueryLangError[] = [];

    constructor() {
      super();
      this.validateVisitor();
    }

    private addErrors(...errors: QueryLangError[]): void {
      this.errors.push(...errors);
    }

    public getErrors(): QueryLangError[] {
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

      throw new QueryLangException('Unreachable');
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
      param?: Param,
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

      throw new QueryLangException('Unreachable');
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

      throw new QueryLangException('Unreachable');
    }

    leftBoundedRange(
      ctx: LeftBoundedRangeCstChildren,
      { keyword }: Param = {},
    ): OutputAst {
      const valueToken = ctx.value[0]!;
      const rangeToken = ctx.range[0]!;
      if (!keyword) {
        this.addErrors({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: rangeToken.endOffset,
          endLine: rangeToken.endLine,
          endColumn: rangeToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }
      if (matchesToken(valueToken, Null)) {
        this.addErrors({
          message: NULL_IS_INVALID_IN_RANGES,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      const value = getValueFromToken(valueToken);
      const {
        config: { transform },
        originalKeyword,
      } = keywords[keyword];
      const res = transform(value);
      if (!res.ok) {
        this.addErrors({
          message: res.error.message,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      return {
        type: 'PREDICATE',
        keyword: originalKeyword,
        op: {
          type: 'GTE',
          value: res.value,
        },
      } as any;
    }

    fullRange(ctx: FullRangeCstChildren, { keyword }: Param = {}): OutputAst {
      const lValueToken = ctx.lValue[0]!;
      const rValueToken = ctx.rValue[0]!;

      if (!keyword) {
        this.addErrors({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: lValueToken.startOffset,
          startLine: lValueToken.startLine,
          startColumn: lValueToken.startColumn,
          endOffset: rValueToken.endOffset,
          endLine: rValueToken.endLine,
          endColumn: rValueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      const isLValueNull = matchesToken(lValueToken, Null);
      if (isLValueNull) {
        this.addErrors({
          message: NULL_IS_INVALID_IN_RANGES,
          startOffset: lValueToken.startOffset,
          startLine: lValueToken.startLine,
          startColumn: lValueToken.startColumn,
          endOffset: lValueToken.endOffset,
          endLine: lValueToken.endLine,
          endColumn: lValueToken.endColumn,
        });
      }
      const isRValueNull = matchesToken(rValueToken, Null);
      if (isRValueNull) {
        this.addErrors({
          message: NULL_IS_INVALID_IN_RANGES,
          startOffset: rValueToken.startOffset,
          startLine: rValueToken.startLine,
          startColumn: rValueToken.startColumn,
          endOffset: rValueToken.endOffset,
          endLine: rValueToken.endLine,
          endColumn: rValueToken.endColumn,
        });
      }
      if (isLValueNull || isRValueNull) {
        return { type: 'AND', children: [] };
      }

      const lValue = getValueFromToken(lValueToken);
      const rValue = getValueFromToken(rValueToken);
      const {
        config: { transform },
        originalKeyword,
      } = keywords[keyword];
      const lRes = transform(lValue);
      const rRes = transform(rValue);
      if (!lRes.ok) {
        this.addErrors({
          message: lRes.error.message,
          startOffset: lValueToken.startOffset,
          startLine: lValueToken.startLine,
          startColumn: lValueToken.startColumn,
          endOffset: lValueToken.endOffset,
          endLine: lValueToken.endLine,
          endColumn: lValueToken.endColumn,
        });
      }
      if (!rRes.ok) {
        this.addErrors({
          message: rRes.error.message,
          startOffset: rValueToken.startOffset,
          startLine: rValueToken.startLine,
          startColumn: rValueToken.startColumn,
          endOffset: rValueToken.endOffset,
          endLine: rValueToken.endLine,
          endColumn: rValueToken.endColumn,
        });
      }
      if (!lRes.ok || !rRes.ok) {
        return { type: 'AND', children: [] };
      }

      return {
        type: 'PREDICATE',
        keyword: originalKeyword,
        op: {
          type: 'BETWEEN',
          min: lRes.value,
          max: rRes.value,
        },
      } as any;
    }

    rightBoundedRange(
      ctx: RightBoundedRangeCstChildren,
      { keyword }: Param = {},
    ): OutputAst {
      const rangeToken = ctx.range[0]!;
      const valueToken = ctx.value[0]!;
      if (!keyword) {
        this.addErrors({
          message: ALLOWED_GLOBAL_SEARCHES,
          startOffset: rangeToken.startOffset,
          startLine: rangeToken.startLine,
          startColumn: rangeToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      if (matchesToken(valueToken, Null)) {
        this.addErrors({
          message: NULL_IS_INVALID_IN_RANGES,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      const value = getValueFromToken(valueToken);
      const {
        config: { transform },
        originalKeyword,
      } = keywords[keyword];
      const res = transform(value);
      if (!res.ok) {
        this.addErrors({
          message: res.error.message,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      return {
        type: 'PREDICATE',
        keyword: originalKeyword,
        op: {
          type: 'LTE',
          value: res.value,
        },
      } as any;
    }

    valueExpression(
      ctx: ValueExpressionCstChildren,
      { keyword }: Param = {},
    ): OutputAst {
      const modifierToken = ctx.modifier?.[0];
      const valueToken = ctx.value[0]!;

      if (
        modifierToken &&
        !matchesToken(modifierToken, Eq) &&
        matchesToken(valueToken, Null)
      ) {
        this.addErrors({
          message:
            '->null<- search is only allowed with "=" modifier. \
Wrap it in single or double quotes to perform a string lookup',
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      if (!keyword) {
        const children: OutputAst[] = [];
        if (matchesToken(valueToken, Null)) {
          for (const kw of Object.keys(originalKeywords)) {
            children.push({
              type: 'PREDICATE',
              keyword: kw,
              op: {
                type: 'IS_NULL',
              },
            });
          }
          if (children.length === 1) {
            return children[0]!;
          }

          return { type: 'OR', children };
        }

        let type: DataType;
        if (matchesToken(valueToken, StringValue)) {
          if (modifierToken && !matchesToken(modifierToken, Eq, Tilde)) {
            this.addErrors({
              message:
                'global string search is only allowed with "=" and "~" modifiers',
              startOffset: modifierToken.startOffset,
              startLine: modifierToken.startLine,
              startColumn: modifierToken.startColumn,
              endOffset: modifierToken.endOffset,
              endLine: modifierToken.endLine,
              endColumn: modifierToken.endColumn,
            });
            return { type: 'AND', children: [] };
          }
          type = 'string';
        } else if (matchesToken(valueToken, NumberValue)) {
          if (modifierToken && !matchesToken(modifierToken, Eq)) {
            this.addErrors({
              message: 'global number search is only allowed with "=" modifier',
              startOffset: modifierToken.startOffset,
              startLine: modifierToken.startLine,
              startColumn: modifierToken.startColumn,
              endOffset: modifierToken.endOffset,
              endLine: modifierToken.endLine,
              endColumn: modifierToken.endColumn,
            });
            return { type: 'AND', children: [] };
          }
          type = 'number';
        } else if (matchesToken(valueToken, BooleanValue)) {
          if (modifierToken && !matchesToken(modifierToken, Eq)) {
            this.addErrors({
              message:
                'global boolean search is only allowed with "=" modifier',
              startOffset: modifierToken.startOffset,
              startLine: modifierToken.startLine,
              startColumn: modifierToken.startColumn,
              endOffset: modifierToken.endOffset,
              endLine: modifierToken.endLine,
              endColumn: modifierToken.endColumn,
            });
            return { type: 'AND', children: [] };
          }
          type = 'boolean';
        } else {
          throw new QueryLangException(
            `Unexpected global value token: ${valueToken.tokenType.name}`,
          );
        }

        const value = getValueFromToken(valueToken);
        for (const [
          kw,
          {
            config: { type: originalKeywordType, transform },
          },
        ] of Object.entries(originalKeywords)) {
          if (originalKeywordType !== type) {
            continue;
          }
          const res = transform(value);
          if (!res.ok) {
            // skip keywords that cannot be searched by this value
            continue;
          }
          const expression = buildKeywordPredicateExpression(
            type,
            kw,
            res.value,
            modifierToken,
          ) as OutputAst;
          children.push(expression);
        }

        if (children.length === 0) {
          this.addErrors({
            message: `->${valueToken.image}<- can't be used to search by any keywords`,
            startOffset: valueToken.startOffset,
            startLine: valueToken.startLine,
            startColumn: valueToken.startColumn,
            endOffset: valueToken.endOffset,
            endLine: valueToken.endLine,
            endColumn: valueToken.endColumn,
          });
        }

        if (children.length === 1) {
          return children[0]!;
        }

        return { type: 'OR', children };
      }

      const {
        config: { type, transform },
        originalKeyword,
      } = keywords[keyword];

      if (matchesToken(valueToken, Null)) {
        return {
          type: 'PREDICATE',
          keyword: originalKeyword,
          op: {
            type: 'IS_NULL',
          },
        };
      }

      const validationRes = isValidTokenWithModifier(
        type,
        valueToken,
        modifierToken,
      );
      if (!validationRes.ok) {
        this.addErrors(...validationRes.errors);
        return { type: 'AND', children: [] };
      }

      const value = getValueFromToken(valueToken);
      const transformRes = transform(value);
      if (!transformRes.ok) {
        this.addErrors({
          message: transformRes.error.message,
          startOffset: valueToken.startOffset,
          startLine: valueToken.startLine,
          startColumn: valueToken.startColumn,
          endOffset: valueToken.endOffset,
          endLine: valueToken.endLine,
          endColumn: valueToken.endColumn,
        });
        return { type: 'AND', children: [] };
      }

      return buildKeywordPredicateExpression(
        type,
        originalKeyword,
        transformRes.value,
        modifierToken,
      ) as OutputAst;
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
