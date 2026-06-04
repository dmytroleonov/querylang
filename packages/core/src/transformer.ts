import { QueryLangError } from '@/erorr.js';
import type { DataType, TransformFn } from '@/types.js';

type StringTransformerConfig = {
  min?: number;
  max?: number;
};

export function stringTransform({
  min = 0,
  max,
}: StringTransformerConfig = {}): TransformFn<'string'> {
  return (value) => {
    if (value.length < min) {
      return {
        ok: false,
        error: { message: `too short, expected >=${min}` },
      };
    }
    if (typeof max !== 'undefined' && value.length > max) {
      return { ok: false, error: { message: `too long, expected <=${max}` } };
    }

    return { ok: true, value };
  };
}

type NumberTransformConfig = {
  min?: number;
  max?: number;
};

const NUMBER_REGEX = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

export function numberTransformer({
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
}: NumberTransformConfig = {}): TransformFn<'number'> {
  return (value) => {
    if (!NUMBER_REGEX.test(value)) {
      return { ok: false, error: { message: 'not a valid number' } };
    }

    const converted = Number(value);
    if (!Number.isFinite(converted)) {
      return {
        ok: false,
        error: { message: 'not a finite number' },
      };
    }

    if (typeof min !== 'undefined' && converted < min) {
      return { ok: false, error: { message: `too small, expected >=${min}` } };
    }

    if (typeof max !== 'undefined' && converted > max) {
      return { ok: false, error: { message: `too big, expected <=${max}` } };
    }

    return { ok: true, value: converted };
  };
}

export function booleanTransformer(): TransformFn<'boolean'> {
  return (value) => {
    if (value !== 'true' && value !== 'false') {
      return {
        ok: false,
        error: { message: 'should be either "true" or "false"' },
      };
    }

    return { ok: true, value: value === 'true' };
  };
}

export function getDefaultTransform(type: DataType): TransformFn<DataType> {
  switch (type) {
    case 'string':
      return stringTransform();
    case 'number':
      return numberTransformer();
    case 'boolean':
      return booleanTransformer();
    default: {
      throw new QueryLangError(`Unknown data type: "${type satisfies never}"`);
    }
  }
}
