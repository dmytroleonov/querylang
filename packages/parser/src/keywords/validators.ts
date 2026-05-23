import { SearchQlError } from '@/errors/searchQlError.js';
import type { DataType, ValidatorFn } from '@/keywords/types.js';

type StringValidatorConfig = {
  min?: number;
  max?: number;
};

// TODO: protect from invalid config
function stringValidator({
  min = 1,
  max,
}: StringValidatorConfig = {}): ValidatorFn {
  return (value: string) => {
    if (value.length < min) {
      return false;
    }
    if (typeof max !== 'undefined' && value.length > max) {
      return false;
    }

    return true;
  };
}

type NumberValidatorConfig = {
  min?: number;
  max?: number;
};

const NUMBER_REGEX = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

// TODO: protect from invalid config
function numberValdiator({
  min,
  max,
}: NumberValidatorConfig = {}): ValidatorFn {
  return (value) => {
    if (!NUMBER_REGEX.test(value)) {
      return false;
    }

    const converted = Number(value);
    if (!Number.isFinite(converted)) {
      return false;
    }

    if (typeof min !== 'undefined' && converted < min) {
      return false;
    }

    if (typeof max !== 'undefined' && converted > max) {
      return false;
    }

    return true;
  };
}

function booleanValidator(): ValidatorFn {
  return (value) => {
    return value === 'true' || value === 'false';
  };
}

export function getDefaultValidator(type: DataType): ValidatorFn {
  switch (type) {
    case 'string':
      return stringValidator();
    case 'number':
      return numberValdiator();
    case 'boolean':
      return booleanValidator();
    default: {
      throw new SearchQlError(`Unknown data type: "${type satisfies never}"`);
    }
  }
}
