export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 200;

export interface PaginationParams {
  page: number;
  limit: number;
}

function toSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parsePaginationParams(query: Record<string, string | string[] | undefined>): PaginationParams {
  const rawPage = toSingleValue(query.page);
  const rawLimit = toSingleValue(query.limit);

  const parsedPage = Number.parseInt(rawPage ?? String(DEFAULT_PAGE), 10);
  const parsedLimit = Number.parseInt(rawLimit ?? String(DEFAULT_LIMIT), 10);

  const page = Number.isNaN(parsedPage) ? DEFAULT_PAGE : Math.max(1, parsedPage);
  const limit = Number.isNaN(parsedLimit) ? DEFAULT_LIMIT : Math.min(MAX_LIMIT, Math.max(1, parsedLimit));

  return { page, limit };
}
