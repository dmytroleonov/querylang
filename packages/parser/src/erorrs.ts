export class SearchQlError extends Error {
  override name = 'SearchQlError';

  constructor(message: string) {
    super(`[SearchQl]: ${message}`);
  }
}
