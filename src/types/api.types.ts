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
