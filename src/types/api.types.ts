export type ApiResponseStatus = 'success' | 'fail';

export type APIErrors = {
  field: string;
  message: string;
};

export interface IApiResponse<T = any> {
  status: ApiResponseStatus;
  message: string;
  data?: T;
  errors?: APIErrors[];
}

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}
