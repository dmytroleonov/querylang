import { type IToken, type TokenType, tokenMatcher } from 'chevrotain';
import {
  Eq,
  Gt,
  Gte,
  Lt,
  Lte,
  NumberValue,
  StringValue,
  Tilde,
} from '@/builtin.js';
import type { IQueryLangToken } from '@/cstVisitor.types.js';
import { QueryLangException } from '@/erorr.js';
import type {
  AnyPredicateExpression,
  DataType,
  QueryLangError,
  UntypedOp,
} from '@/types.js';

export function escapeString(input: string): string {
  const firstCh = input.charAt(0);
  const isQuotedString = firstCh === '"' || firstCh === "'";
  if (isQuotedString) {
    const unquoted = input.slice(1, input.length - 1);
    return escapeUnquotedString(unquoted);
  }

  return escapeUnquotedString(input);
}

function escapeUnquotedString(input: string): string {
  let res = '';
  let i = 0;
  while (i < input.length) {
    const ch = input.charAt(i);
    if (ch !== '\\') {
      res += ch;
      i++;
      continue;
    }

    const nextCh = input.charAt(i + 1);
    if (nextCh === 'n') {
      res += '\n';
    } else if (nextCh === 'r') {
      res += '\r';
    } else if (nextCh === 'f') {
      res += '\f';
    } else if (nextCh === 'b') {
      res += '\b';
    } else if (nextCh === 't') {
      res += '\t';
    } else {
      res += nextCh;
    }
    i += 2;
  }

  return res;
}

export function matchesToken(
  token: IQueryLangToken | IToken,
  ...tokensToMatch: [TokenType, ...TokenType[]]
): boolean {
  return tokensToMatch.some((tokenToMatch) =>
    tokenMatcher(token, tokenToMatch),
  );
}

const VALID_NUMBER_MODIFIERS =
  'Only "=", ">", ">=", "<", "<=" modifiers are allowed for numbers';
const VALID_BOOLEAN_MODIFIERS = 'Only "=" modifier is allowed for booleans';

type ModiferValidationResult =
  | { ok: true }
  | {
      ok: false;
      errors: QueryLangError[];
    };

function expectedNumberMessage(value: string): string {
  return `expected number, got ->${value}<-`;
}

function expectedBooleanMessage(value: string): string {
  return `expected "true" or "false", got ->${value}<-`;
}

// Should only be called after performing null checks
export function isValidTokenWithModifier(
  type: DataType,
  valueToken: IQueryLangToken,
  modifierToken?: IQueryLangToken,
): ModiferValidationResult {
  if (!modifierToken || type === 'string') {
    return { ok: true };
  }

  if (type === 'number') {
    const errors: QueryLangError[] = [];
    const isNumberToken = matchesToken(valueToken, NumberValue);
    if (!isNumberToken) {
      errors.push({
        message: expectedNumberMessage(valueToken.image),
        startOffset: valueToken.startOffset,
        startLine: valueToken.startLine,
        startColumn: valueToken.startColumn,
        endOffset: valueToken.endOffset,
        endLine: valueToken.endLine,
        endColumn: valueToken.endColumn,
      });
    }
    const isValid = matchesToken(modifierToken, Eq, Lt, Lte, Gt, Gte);
    if (!isValid) {
      errors.push({
        message: VALID_NUMBER_MODIFIERS,
        startOffset: modifierToken.startOffset,
        startLine: modifierToken.startLine,
        startColumn: modifierToken.startColumn,
        endOffset: modifierToken.endOffset,
        endLine: modifierToken.endLine,
        endColumn: modifierToken.endColumn,
      });
    }
    if (errors.length !== 0) {
      return { ok: false, errors };
    }

    return { ok: true };
  }

  if (type === 'boolean') {
    const errors: QueryLangError[] = [];
    const isBooleanToken = matchesToken(valueToken, NumberValue);
    if (!isBooleanToken) {
      errors.push({
        message: expectedBooleanMessage(valueToken.image),
        startOffset: valueToken.startOffset,
        startLine: valueToken.startLine,
        startColumn: valueToken.startColumn,
        endOffset: valueToken.endOffset,
        endLine: valueToken.endLine,
        endColumn: valueToken.endColumn,
      });
    }
    const isValid = matchesToken(modifierToken, Eq);
    if (isValid) {
      errors.push({
        message: VALID_BOOLEAN_MODIFIERS,
        startOffset: modifierToken.startOffset,
        startLine: modifierToken.startLine,
        startColumn: modifierToken.startColumn,
        endOffset: modifierToken.endOffset,
        endLine: modifierToken.endLine,
        endColumn: modifierToken.endColumn,
      });
    }

    if (errors.length !== 0) {
      return { ok: false, errors };
    }

    return { ok: true };
  }

  throw new QueryLangException(
    `Unexpected keyword type: ${type satisfies never}`,
  );
}

export function getValueFromToken(token: IQueryLangToken): string {
  if (matchesToken(token, StringValue)) {
    return escapeString(token.image);
  } else {
    return token.image;
  }
}

export function buildKeywordPredicateExpression(
  type: DataType,
  keyword: string,
  value: string | number | boolean,
  modifierToken?: IQueryLangToken,
): AnyPredicateExpression {
  if (type === 'string') {
    if (!modifierToken) {
      return {
        type: 'PREDICATE',
        keyword,
        op: {
          type: 'ILIKE',
          value,
        },
      };
    }

    let op: UntypedOp | undefined;
    if (matchesToken(modifierToken, Eq)) {
      op = { type: 'EQ', value };
    }
    if (matchesToken(modifierToken, Lt)) {
      op = { type: 'LT', value };
    }
    if (matchesToken(modifierToken, Lte)) {
      op = { type: 'LTE', value };
    }
    if (matchesToken(modifierToken, Gt)) {
      op = { type: 'GT', value };
    }
    if (matchesToken(modifierToken, Gte)) {
      op = { type: 'GTE', value };
    }
    if (matchesToken(modifierToken, Tilde)) {
      op = { type: 'LIKE', value };
    }
    if (!op) {
      throw new QueryLangException(
        `Unexpected string modifier: ${modifierToken.image}`,
      );
    }

    return {
      type: 'PREDICATE',
      keyword,
      op,
    };
  }
  if (type === 'number') {
    if (!modifierToken) {
      return {
        type: 'PREDICATE',
        keyword,
        op: {
          type: 'EQ',
          value,
        },
      };
    }

    let op: UntypedOp | undefined;
    if (matchesToken(modifierToken, Eq)) {
      op = { type: 'EQ', value };
    }
    if (matchesToken(modifierToken, Lt)) {
      op = { type: 'LT', value };
    }
    if (matchesToken(modifierToken, Lte)) {
      op = { type: 'LTE', value };
    }
    if (matchesToken(modifierToken, Gt)) {
      op = { type: 'GT', value };
    }
    if (matchesToken(modifierToken, Gte)) {
      op = { type: 'GTE', value };
    }
    if (!op) {
      throw new QueryLangException(
        `Unexpected number modifier: ${modifierToken.image}`,
      );
    }

    return {
      type: 'PREDICATE',
      keyword,
      op,
    };
  }
  if (type === 'boolean') {
    if (!modifierToken) {
      return {
        type: 'PREDICATE',
        keyword,
        op: {
          type: 'EQ',
          value,
        },
      };
    }

    let op: UntypedOp | undefined;
    if (matchesToken(modifierToken, Eq)) {
      op = { type: 'EQ', value };
    }
    if (!op) {
      throw new QueryLangException(
        `Unexpected boolean modifier: ${modifierToken.image}`,
      );
    }

    return {
      type: 'PREDICATE',
      keyword,
      op,
    };
  }

  throw new QueryLangException(`Unexpected data type: ${type satisfies never}`);
}
