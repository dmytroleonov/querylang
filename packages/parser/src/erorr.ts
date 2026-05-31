export class QueryLangError extends Error {
  override name = 'QueryLangError';

  constructor(message: string) {
    super(`[QueryLang]: ${message}`);
  }
}
