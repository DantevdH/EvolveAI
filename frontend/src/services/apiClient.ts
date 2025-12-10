import {API_CONFIG} from '../constants/api';
import {userStorage} from '../utils/storage';
import {TokenManager} from './tokenManager';

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await userStorage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401: boolean = true,
    externalSignal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getAuthHeaders();

      const config: RequestInit = {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Request timeout after', this.timeout, 'ms');
        controller.abort();
      }, this.timeout);

      // If external signal provided, abort our controller when it aborts
      if (externalSignal) {
        if (externalSignal.aborted) {
          clearTimeout(timeoutId);
          throw new ApiError('Request was cancelled', 'ABORTED');
        }
        externalSignal.addEventListener('abort', () => {
          controller.abort();
        });
      }

      console.log('📡 Making fetch request...');
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Handle 401 Unauthorized - try to refresh token and retry
      if (response.status === 401 && retryOn401) {
        console.log('🔄 401 Unauthorized - attempting token refresh...');
        const newToken = await TokenManager.refreshAccessToken();
        
        if (newToken) {
          console.log('✅ Token refreshed successfully, retrying request...');
          
          // CRITICAL: Update jwt_token in request body if present
          // The backend reads jwt_token from the body, not the Authorization header
          let updatedOptions = { ...options };
          if (options.body) {
            try {
              const bodyJson = JSON.parse(options.body as string);
              if (bodyJson.jwt_token) {
                bodyJson.jwt_token = newToken;
                updatedOptions.body = JSON.stringify(bodyJson);
                console.log('🔄 Updated jwt_token in request body with refreshed token');
              }
            } catch (e) {
              // If body is not JSON or doesn't have jwt_token, continue with original body
              console.warn('Could not update jwt_token in request body:', e);
            }
          }
          
          // Retry the request with the new token (only once to avoid infinite loops)
          return this.request<T>(endpoint, updatedOptions, false);
        } else {
          console.error('❌ Failed to refresh token');
          const errorData = await response.json().catch(() => ({}));
          throw new ApiError(
            errorData.detail || errorData.message || 'Authentication failed. Please sign in again.',
            'AUTH_ERROR'
          );
        }
      }

      if (!response.ok) {
        console.error('❌ Response not OK:', {
          status: response.status,
          statusText: response.statusText
        });
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response data:', errorData);
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response data parsed successfully:', {
        hasData: !!data,
        dataKeys: Object.keys(data || {}),
        success: data?.success
      });
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', {
        error: error,
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isAbortError: error instanceof Error && error.name === 'AbortError',
        endpoint: endpoint
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request was aborted', 'ABORTED');
        }
        throw new ApiError(error.message, 'REQUEST_FAILED');
      }
      throw new ApiError('Unknown error occurred', 'UNKNOWN_ERROR');
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any, options?: { signal?: AbortSignal }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, true, options?.signal);
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
