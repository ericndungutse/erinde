import { startOfDay } from "date-fns";
import { type Document, type Query } from "mongoose";
import { logger } from "../logger.js";
import { parsePaginationParams } from "./pagination.js";
/**
 * Parsed query string from Express req.query.
 * All values are strings at the HTTP layer.
 */
interface QueryString {
  [key: string]: string | string[] | undefined;
  page?: string;
  sort?: string;
  limit?: string;
  fields?: string;
}

/**
 * APIFeatures wraps a Mongoose Query and progressively narrows it
 * using URL query-string parameters. Chain the methods then `await features.query`.
 *
 * Supported query params:
 * ─ Filtering ──────────────────
 *   ?roles=USER              → exact match
 *   ?createdAt[gte]=2024-01-01 → comparison operators (gte, gt, lte, lt)
 *
 * ─ Sorting ────────────────────
 *   ?sort=lastname           → ascending
 *   ?sort=-createdAt,lastname → multiple fields (comma-separated)
 *   (default: -createdAt)
 *
 * ─ Field limiting ─────────────
 *   ?fields=firstname,lastname,roles → include only these fields
 *   (default: all except __v)
 *
 * ─ Pagination ─────────────────
 *   ?page=2&limit=10
 *   (default: page=1, limit=100)
 *
 * Usage example:
 *   const features = new APIFeatures(User.find(), req.query)
 *     .filter()
 *     .sort()
 *     .limitFields()
 *     .paginate();
 *   const users = await features.query;
 */
export class APIFeatures<T extends Document> {
  query: Query<T[], T>;
  private queryString: QueryString;
  page?: number;
  limit?: number;

  constructor(query: Query<T[], T>, queryString: QueryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /** Apply exact-match and comparison filters, excluding pagination/sort/fields params. */
  filter(): this {
    const queryObj: Record<string, unknown> = { ...this.queryString };

    const excluded = ["page", "sort", "limit", "fields"];
    excluded.forEach((key) => delete queryObj[key]);

    let queryStr = JSON.stringify(queryObj);

    // log original query string for debugging
    logger.debug(`Original query string: ${queryStr}`);

    // Replace gte/gt/lte/lt with MongoDB $ operators
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Replace date strings next to comparison operators with Date objects
    queryStr = queryStr.replace(
      /"\$(gte|gt)":\s*"(\d{4}-\d{2}-\d{2})"/g,
      (_, op, date) =>
        // We receive Kigali date strings, we get start of the day of that date in Kigali timezone and convert to ISO string for MongoDB
        `"$${op}":"${startOfDay(date)}"`,
    );
    queryStr = queryStr.replace(
      /"\$(lte|lt)":\s*"(\d{4}-\d{2}-\d{2})"/g,
      (_, op, date) =>
        // // We receive Kigali date strings, we get start of the day of that date in Kigali timezone and convert to ISO string for MongoDB
        `"$${op}":"${startOfDay(date)}"`,
    );

    // If lt or lte, log it
    if (queryStr.includes("$lt") || queryStr.includes("$lte")) {
      logger.info(`Applying filter with query: ${queryStr}`);
    }

    // if gt or gte, log it
    if (queryStr.includes("$gt") || queryStr.includes("$gte")) {
      logger.info(`Applying filter with query: ${queryStr}`);
    }

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  /** Sort results. Comma-separated fields; prefix with `-` for descending. */
  sort(): this {
    if (this.queryString.sort) {
      const sortBy = (this.queryString.sort as string).split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  /** Restrict returned fields. Comma-separated field names. */
  limitFields(): this {
    if (this.queryString.fields) {
      const fields = (this.queryString.fields as string).split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  /** Skip/limit results for pagination. */
  paginate(): this {
    const { page, limit } = parsePaginationParams(this.queryString);
    this.page = page;
    this.limit = limit;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
