export interface ApiError {
  error: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
