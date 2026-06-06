export class QueryLangException extends Error {
  override name = 'QueryLangError';

  constructor(message: string) {
    super(`[QueryLang]: ${message}`);
  }
}
