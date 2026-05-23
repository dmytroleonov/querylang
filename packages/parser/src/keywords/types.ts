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
