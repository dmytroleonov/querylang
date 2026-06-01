import type { CstNode, ICstVisitor, IToken } from 'chevrotain';

export interface OrExpressionCstNode extends CstNode {
  name: 'orExpression';
  children: OrExpressionCstChildren;
}

export type OrExpressionCstChildren = {
  andExpression: AndExpressionCstNode[];
  or?: IToken[];
};

export interface AndExpressionCstNode extends CstNode {
  name: 'andExpression';
  children: AndExpressionCstChildren;
}

export type AndExpressionCstChildren = {
  keywordOrAtomicExpression: KeywordOrAtomicExpressionCstNode[];
  and?: IToken[];
};

export interface KeywordOrAtomicExpressionCstNode extends CstNode {
  name: 'keywordOrAtomicExpression';
  children: KeywordOrAtomicExpressionCstChildren;
}

export type KeywordOrAtomicExpressionCstChildren = {
  keywordExpression?: KeywordExpressionCstNode[];
  atomicExpression?: AtomicExpressionCstNode[];
};

export interface KeywordExpressionCstNode extends CstNode {
  name: 'keywordExpression';
  children: KeywordExpressionCstChildren;
}

export type KeywordExpressionCstChildren = {
  not?: IToken[];
  keyword: IToken[];
  colon: IToken[];
  atomicExpression: AtomicExpressionCstNode[];
};

export interface AtomicExpressionCstNode extends CstNode {
  name: 'atomicExpression';
  children: AtomicExpressionCstChildren;
}

export type AtomicExpressionCstChildren = {
  not?: IToken[];
  parenthesisExpression?: ParenthesisExpressionCstNode[];
  rangeExpression?: RangeExpressionCstNode[];
  valueExpression?: ValueExpressionCstNode[];
};

export interface ParenthesisExpressionCstNode extends CstNode {
  name: 'parenthesisExpression';
  children: ParenthesisExpressionCstChildren;
}

export type ParenthesisExpressionCstChildren = {
  lParen: IToken[];
  orExpression: OrExpressionCstNode[];
  rParen: IToken[];
};

export interface RangeExpressionCstNode extends CstNode {
  name: 'rangeExpression';
  children: RangeExpressionCstChildren;
}

export type RangeExpressionCstChildren = {
  fullRange?: FullRangeCstNode[];
  rightBoundedRange?: RightBoundedRangeCstNode[];
  leftBoundedRange?: LeftBoundedRangeCstNode[];
};

export interface RightBoundedRangeCstNode extends CstNode {
  name: 'rightBoundedRange';
  children: RightBoundedRangeCstChildren;
}

export type RightBoundedRangeCstChildren = {
  range: IToken[];
  anyValue: IToken[];
};

export interface FullRangeCstNode extends CstNode {
  name: 'fullRange';
  children: FullRangeCstChildren;
}

export type FullRangeCstChildren = {
  anyValue: IToken[];
  range: IToken[];
};

export interface LeftBoundedRangeCstNode extends CstNode {
  name: 'leftBoundedRange';
  children: LeftBoundedRangeCstChildren;
}

export type LeftBoundedRangeCstChildren = {
  anyValue: IToken[];
  range: IToken[];
};

export interface ValueExpressionCstNode extends CstNode {
  name: 'valueExpression';
  children: ValueExpressionCstChildren;
}

export type ValueExpressionCstChildren = {
  gte?: IToken[];
  gt?: IToken[];
  lte?: IToken[];
  lt?: IToken[];
  eq?: IToken[];
  tilde?: IToken[];
  anyValue: IToken[];
};

export interface IQueryLangVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  orExpression(ctx: OrExpressionCstChildren, param?: IN): OUT;
  andExpression(ctx: AndExpressionCstChildren, param?: IN): OUT;
  keywordOrAtomicExpression(
    ctx: KeywordOrAtomicExpressionCstChildren,
    param?: IN,
  ): OUT;
  keywordExpression(ctx: KeywordExpressionCstChildren, param?: IN): OUT;
  atomicExpression(ctx: AtomicExpressionCstChildren, param?: IN): OUT;
  parenthesisExpression(ctx: ParenthesisExpressionCstChildren, param?: IN): OUT;
  rangeExpression(ctx: RangeExpressionCstChildren, param?: IN): OUT;
  rightBoundedRange(ctx: RightBoundedRangeCstChildren, param?: IN): OUT;
  fullRange(ctx: FullRangeCstChildren, param?: IN): OUT;
  leftBoundedRange(ctx: LeftBoundedRangeCstChildren, param?: IN): OUT;
  valueExpression(ctx: ValueExpressionCstChildren, param?: IN): OUT;
}
