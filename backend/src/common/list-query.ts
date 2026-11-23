import { z } from "zod";

export type ListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  sort: string;
  order: "asc" | "desc";
  skip: number;
  take: number;
};

/** Parse a consistent paginated-list query while allowlisting endpoint sort fields. */
export function parseListQuery(
  input: unknown,
  allowedSortFields: readonly [string, ...string[]],
  defaultSort: string,
  defaultOrder: "asc" | "desc" = "desc",
): ListQuery {
  const sortSchema = z.enum(allowedSortFields);
  const validatedDefaultSort = sortSchema.parse(defaultSort);
  const schema = z.object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.preprocess(
      (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().max(120).optional(),
    ),
    sort: sortSchema.default(validatedDefaultSort),
    order: z.enum(["asc", "desc"]).default(defaultOrder),
  });
  const parsed = schema.parse(input);
  return {
    ...parsed,
    skip: (parsed.page - 1) * parsed.pageSize,
    take: parsed.pageSize,
  };
}

export function paginationMeta(page: number, pageSize: number, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
