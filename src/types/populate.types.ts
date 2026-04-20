export type Populate = {
  ref: string | undefined;
  allFields?: boolean | undefined;
  fields?: string[] | undefined;
}[];

export type project = {
  [key: string]: 1 | 0;
};
