export type DataType = 'string' | 'number' | 'boolean';

export type Aliases = Record<string, true>;

export type InferTsType<T extends DataType> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : T extends 'boolean'
      ? boolean
      : never;

export type TransformError = {
  message: string;
};

export type TransformResult<T extends DataType> =
  | {
      ok: true;
      value: InferTsType<T>;
    }
  | {
      ok: false;
      error: TransformError;
    };

export type TransformFn<T extends DataType> = (
  value: string,
) => TransformResult<T>;

export type KeywordTypeFactory<TDataType extends DataType> = {
  type: TDataType;
  aliases?: Aliases;
  transform?: TransformFn<TDataType>;
};

export type StringKeywordType = KeywordTypeFactory<'string'>;
export type NumberKeywordType = KeywordTypeFactory<'number'>;
export type BooleanKeywordType = KeywordTypeFactory<'boolean'>;
export type AnyKeyword =
  | StringKeywordType
  | NumberKeywordType
  | BooleanKeywordType;

export type CreateKeywordInput = Record<string, AnyKeyword>;

export type InferKeywordConfig<TKeywords extends CreateKeywordInput> = {
  [K in keyof TKeywords]: TKeywords[K]['type'] extends BooleanKeywordType['type']
    ? boolean
    : TKeywords[K]['type'] extends StringKeywordType['type']
      ? string
      : TKeywords[K]['type'] extends NumberKeywordType['type']
        ? number
        : never;
};

export type OpTypeMap = {
  BETWEEN: 'BETWEEN';
  EQ: 'EQ';
  GTE: 'GTE';
  GT: 'GT';
  LTE: 'LTE';
  LT: 'LT';
  LIKE: 'LIKE';
  ILIKE: 'ILIKE';
};

export type AnyOpType = keyof OpTypeMap;

export type BetweenOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: OpTypeMap['BETWEEN'];
  min: TConfig[TKeyword];
  max: TConfig[TKeyword];
};

export type EqOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: OpTypeMap['EQ'];
  value: TConfig[TKeyword];
};

export type LtOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: OpTypeMap['LT'];
  value: TConfig[TKeyword];
};

export type LteOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: OpTypeMap['LTE'];
  value: TConfig[TKeyword];
};

export type GtOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: OpTypeMap['GT'];
  value: TConfig[TKeyword];
};

export type GteOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: OpTypeMap['GTE'];
  value: TConfig[TKeyword];
};

export type ILikeOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: OpTypeMap['ILIKE'];
  value: TConfig[TKeyword];
};

export type LikeOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: OpTypeMap['LIKE'];
  value: TConfig[TKeyword];
};

export type StringOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> =
  | ILikeOp<TConfig, TKeyword>
  | LikeOp<TConfig, TKeyword>
  | EqOp<TConfig, TKeyword>;

export type NumberOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> =
  | BetweenOp<TConfig, TKeyword>
  | EqOp<TConfig, TKeyword>
  | LtOp<TConfig, TKeyword>
  | LteOp<TConfig, TKeyword>
  | GtOp<TConfig, TKeyword>
  | GteOp<TConfig, TKeyword>;

export type BooleanOp<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = EqOp<TConfig, TKeyword>;

export type Op<TConfig extends KeywordTypes, TKeyword extends keyof TConfig> =
  | ILikeOp<TConfig, TKeyword>
  | LikeOp<TConfig, TKeyword>
  | BetweenOp<TConfig, TKeyword>
  | EqOp<TConfig, TKeyword>
  | LtOp<TConfig, TKeyword>
  | LteOp<TConfig, TKeyword>
  | GtOp<TConfig, TKeyword>
  | GteOp<TConfig, TKeyword>;

export type KeywordExpression<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: 'KEYWORD';
} & { [K in TKeyword]: { keyword: K; op: Op<TConfig, K> } }[TKeyword];

export type AndExpression<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: 'AND';
  children: Expression<TConfig, TKeyword>[];
};

export type OrExpression<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig,
> = {
  type: 'OR';
  children: Expression<TConfig, TKeyword>[];
};

export type NotExpression<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig = keyof TConfig,
> = {
  type: 'NOT';
  operand: Expression<TConfig, TKeyword>;
};

export type KeywordDataType = number | string | boolean;
export type KeywordTypes = Record<string, KeywordDataType>;
export type AnyKeywordExpression = KeywordExpression<
  { [key: string]: KeywordDataType },
  string
>;

export type Expression<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig = keyof TConfig,
> =
  | OrExpression<TConfig, TKeyword>
  | AndExpression<TConfig, TKeyword>
  | KeywordExpression<TConfig, TKeyword>
  | NotExpression<TConfig, TKeyword>;

export type Empty = { type: 'EMPTY' };

export type Ast<
  TConfig extends KeywordTypes,
  TKeyword extends keyof TConfig = keyof TConfig,
> = Expression<TConfig, TKeyword> | Empty;
