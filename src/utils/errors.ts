import type { AxiosError } from 'axios';

interface ApiErrorBody {
  message?: string | string[];
  description?: string;
}

/** The backend's message from a failed request (Nest validation arrays are joined), or `fallback`. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (error as AxiosError<ApiErrorBody> | undefined)?.response?.data;
  if (typeof data?.description === 'string' && data.description && data.description !== 'SUCCESS') return data.description;
  if (Array.isArray(data?.message)) return data.message.join(', ');
  if (typeof data?.message === 'string' && data.message) return data.message;
  return fallback;
}
