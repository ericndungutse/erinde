import type { Populate, project } from "../types/populate.types.js";

export class MongoQueryUtils {
  /**
   * Transforms a project object into a Mongoose select string or object
   */
  static applySelect(query: any, select: project) {
    if (select && Object.keys(select).length > 0) {
      query.select(select);
    }
    return query;
  }

  /**
   * Transforms the custom populate type into a Mongoose populate object
   */
  static applyPopulate(query: any, populate: Populate) {
    // 1. Guard clause for empty or undefined arrays
    if (!populate || populate.length === 0) return query;

    // 2. Map the array of objects into the format the query engine expects
    const populateOptions = populate.map((item) => {
      const option: any = {
        path: item.ref,
      };

      // 3. Handle field selection logic per item
      if (!item.allFields && item.fields && item.fields.length > 0) {
        option.select = item.fields.join(" ");
      }

      return option;
    });

    // 4. Apply the array of options to the query
    return query.populate(populateOptions);
  }
}
