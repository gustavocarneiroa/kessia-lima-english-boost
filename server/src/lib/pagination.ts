export interface PageParams {
  page: number;
  pageSize: number;
  offset: number;
}

export function parsePagination(query: Record<string, unknown>, defaultPageSize = 20, maxPageSize = 100): PageParams {
  const rawPage = Number.parseInt(String(query.page ?? "1"), 10);
  const rawPageSize = Number.parseInt(String(query.pageSize ?? defaultPageSize), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, maxPageSize) : defaultPageSize;
  return { page, pageSize, offset: (page - 1) * pageSize };
}
