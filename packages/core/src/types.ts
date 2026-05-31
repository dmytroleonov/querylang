export type DataType = 'string' | 'number' | 'boolean';

export type Aliases = Record<string, true>;

export type ValidatorFn = (value: string) => boolean;

export type KeywordTypeFactory<TDataType extends DataType> = {
  type: TDataType;
  aliases?: Aliases;
  validator?: ValidatorFn;
};

export type StringKeywordType = KeywordTypeFactory<'string'>;
export type NumberKeywordType = KeywordTypeFactory<'number'>;
export type BooleanKeywordType = KeywordTypeFactory<'boolean'>;
export type AnyKeyword =
  | StringKeywordType
  | NumberKeywordType
  | BooleanKeywordType;

export type CreateKeywordInput = Record<string, AnyKeyword>;

export type LRangeOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'L_RANGE';
  min: TConfig[TKeyword];
};

export type RRangeOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'R_RANGE';
  max: TConfig[TKeyword];
};

export type FullRangeOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'FULL_RANGE';
  min: TConfig[TKeyword];
  max: TConfig[TKeyword];
};

export type EqOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'EQ';
  value: TConfig[TKeyword];
};

export type LtOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'LT';
  value: TConfig[TKeyword];
};

export type LteOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'LTE';
  value: TConfig[TKeyword];
};

export type GtOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'GT';
  value: TConfig[TKeyword];
};

export type GteOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'GTE';
  value: TConfig[TKeyword];
};

export type ILikeOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'ILIKE';
  value: TConfig[TKeyword];
};

export type LikeOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  op: 'LIKE';
  value: TConfig[TKeyword];
};

export type StringOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> =
  | ILikeOp<TConfig, TKeyword>
  | LikeOp<TConfig, TKeyword>
  | EqOp<TConfig, TKeyword>;

export type NumberOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> =
  | LRangeOp<TConfig, TKeyword>
  | RRangeOp<TConfig, TKeyword>
  | FullRangeOp<TConfig, TKeyword>
  | EqOp<TConfig, TKeyword>
  | LtOp<TConfig, TKeyword>
  | LteOp<TConfig, TKeyword>
  | GtOp<TConfig, TKeyword>
  | GteOp<TConfig, TKeyword>;

export type BooleanOp<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = EqOp<TConfig, TKeyword>;

export type Op<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = TConfig[TKeyword] extends string
  ? StringOp<TConfig, TKeyword>
  : TConfig[TKeyword] extends number
    ? NumberOp<TConfig, TKeyword>
    : TConfig[TKeyword] extends boolean
      ? BooleanOp<TConfig, TKeyword>
      : never;

export type KeywordExpression<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  type: 'KEYWORD';
} & { [K in TKeyword]: { keyword: K; value: Op<TConfig, K> } }[TKeyword];

export type AndExpression<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  type: 'AND';
  children: Expression<TConfig, TKeyword>[];
};

export type OrExpression<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig,
> = {
  type: 'OR';
  children: Expression<TConfig, TKeyword>[];
};

export type TKeywordConfig = Record<string, number | string | boolean>;

export type Expression<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig = keyof TConfig,
> =
  | OrExpression<TConfig, TKeyword>
  | AndExpression<TConfig, TKeyword>
  | KeywordExpression<TConfig, TKeyword>;

export type Empty = { type: 'EMPTY' };

export type Ast<
  TConfig extends TKeywordConfig,
  TKeyword extends keyof TConfig = keyof TConfig,
> = Expression<TConfig, TKeyword> | Empty;
