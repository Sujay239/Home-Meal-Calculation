import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Storage } from '@/utils/storage';
import { getBypassCookie, clearBypassCookie } from '@/utils/challengeSolver';

// --------------------------------------------------------------
// 1. Dynamic API Base URL Configuration
// --------------------------------------------------------------
// Direct server URL (blocked by many Indian mobile ISPs)
// const API_BASE_URL = 'https://kolkata-room.gamer.gd';
//
// PROXY URL: Deploy the Cloudflare Worker from /proxy/worker.js
// then paste your Worker URL below. See /proxy/README.md for instructions.
// Example: 'https://meal-api-proxy.YOUR_SUBDOMAIN.workers.dev'
const API_BASE_URL = 'https://meal-api-proxy.sujaykumarkotal49.workers.dev';

// --------------------------------------------------------------
// 2. Create Axios Instance
// --------------------------------------------------------------
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// --------------------------------------------------------------
// 3. Transparent GET Response Cache
// --------------------------------------------------------------
const apiCache: Record<string, { data: any; expiry: number }> = {};
const CACHE_TTL_MS = 5000; // 5 seconds

// --------------------------------------------------------------
// 4. Request Interceptor (Cookie Bypass, JWT, & Caching)
// --------------------------------------------------------------
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Inject the bypass cookie for InfinityFree challenge
    // Always inject regardless of domain (needed when using a proxy like Cloudflare Workers)
    try {
      const cookie = await getBypassCookie(config.baseURL || API_BASE_URL);
      if (cookie) {
        config.headers['Cookie'] = `__test=${cookie}`;
        // Store the cookie value used for this request to track stale cookie failures
        (config as any)._cookieUsed = cookie;
      }
    } catch (cookieError) {
      console.warn('[API Client] Cookie bypass failed:', cookieError);
    }

    // 2. Inject JWT token
    try {
      const token = await Storage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        
        // Fallback: Append token as a query parameter (for servers that strip Authorization headers)
        config.params = {
          ...config.params,
          token: token
        };
      }
    } catch (error) {
      console.error('[API Client] Token retrieval error:', error);
    }

    // 3. Handle Cache Lookup for GET requests
    if (config.method?.toLowerCase() === 'get') {
      const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
      const cached = apiCache[cacheKey];
      const now = Date.now();
      const bypassCache = config.headers?.['Cache-Control'] === 'no-cache' || config.headers?.['Pragma'] === 'no-cache';

      if (cached && cached.expiry > now && !bypassCache) {
        if (__DEV__) {
          console.log(`[API Client] Serve from cache -> ${config.url}`);
        }
        const source = axios.CancelToken.source();
        config.cancelToken = source.token;
        source.cancel(JSON.stringify({ isCacheHit: true, data: cached.data }));
        return config;
      }
    } else {
      // Invalidate cache on mutations (POST, PUT, DELETE)
      if (__DEV__) {
        console.log(`[API Client] Mutation detected (${config.method?.toUpperCase()} -> ${config.url}). Invalidating cache.`);
      }
      for (const key in apiCache) {
        delete apiCache[key];
      }
    }

    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} -> ${config.baseURL}${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --------------------------------------------------------------
// 5. Response Interceptor (Global Error Handling & Cache Caching)
// --------------------------------------------------------------
apiClient.interceptors.response.use(
  async (response) => {
    if (__DEV__) {
      console.log(`[API Response] Success from ${response.config.url}`);
    }

    // Check if the response is actually the InfinityFree challenge page (HTML string containing slowAES)
    if (
      typeof response.data === 'string' &&
      (response.data.includes('slowAES.decrypt') || response.data.includes('toNumbers') || response.data.includes('__test'))
    ) {
      if (__DEV__) {
        console.warn('[API Client] Detected security challenge page in response instead of expected JSON.');
      }
      clearBypassCookie((response.config as any)._cookieUsed);
      
      const config = response.config;
      if (config && !(config as any)._retry) {
        (config as any)._retry = true;
        if (__DEV__) {
          console.log(`[API Client] Retrying request after solving challenge: ${config.url}`);
        }
        try {
          return await apiClient(config);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }

      // If already retried or config missing, reject
      return Promise.reject({
        config: response.config,
        message: 'Security challenge detected',
        status: 307,
        response: response,
      });
    }

    // Cache the response if it is a successful GET request
    const config = response.config;
    if (config.method?.toLowerCase() === 'get') {
      const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
      apiCache[cacheKey] = {
        data: response.data,
        expiry: Date.now() + CACHE_TTL_MS,
      };
    }

    return response.data;
  },
  async (error) => {
    // Check if error is a cancelled request due to a cache hit
    if (axios.isCancel(error)) {
      try {
        const cancelData = JSON.parse(error.message || '{}');
        if (cancelData.isCacheHit) {
          return Promise.resolve(cancelData.data);
        }
      } catch (e) {
        // Not a cache hit cancellation
      }
    }

    const config = error.config;

    // Determine if the error is a network drop
    const isNetworkError = error.message === 'Network Error' || error.status === 307 || error.response?.status === 307 || error.response?.status === 403;

    if (isNetworkError) {
      clearBypassCookie(config ? (config as any)._cookieUsed : undefined);

      // Retry the request once if it hasn't been retried yet
      if (config && !(config as any)._retry) {
        (config as any)._retry = true;
        if (__DEV__) {
          console.log(`[API Client] Retrying failed request due to network drop: ${config.url}`);
        }
        
        try {
          return await apiClient(config);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
    }

    let errorMsg = error.response?.data?.message || error.message || 'An unknown network error occurred';

    // Enhance Network Error message to help debug ISP blocking issues
    if (errorMsg === 'Network Error') {
      errorMsg = 'Network Error: Cannot connect to the server. Your mobile network (e.g. Jio/Airtel) might be blocking the server domain. Try using Wi-Fi or a VPN.';
    }

    if (__DEV__) {
      console.warn(`[API Error] Details:`, error.response?.data || error.message);
    }

    return Promise.reject({
      status: error.response?.status || error.status,
      message: errorMsg,
      data: error.response?.data,
      originalError: error,
    });
  }
);

// --------------------------------------------------------------
// 5. Shared API Services
// --------------------------------------------------------------
export const authService = {
  /**
   * Authenticate roommate
   */
  login: async (username: string, password: string): Promise<any> => {
    return apiClient.post('/api/login.php', { username, password });
  },

  /**
   * Register a new roommate
   */
  register: async (userData: { username: string; password: string; role: string }): Promise<any> => {
    return apiClient.post('/api/register.php', userData);
  },
};

export const mealService = {
  /**
   * Fetch logged meals for filter parameters
   */
  getMeals: async (params?: { month?: number; year?: number }): Promise<any> => {
    return apiClient.get('/api/meals.php', { params });
  },

  /**
   * Log a new meal
   */
  logMeal: async (mealData: { username: string }): Promise<any> => {
    return apiClient.post('/api/meals.php', mealData);
  },
};

export const purchaseService = {
  /**
   * Fetch room purchases
   */
  getPurchases: async (params?: { month?: number; year?: number }): Promise<any> => {
    return apiClient.get('/api/purchases.php', { params });
  },

  /**
   * Log a purchase (item name must be English & positive numeric amount)
   */
  logPurchase: async (purchaseData: { username: string; product: string; price: number }): Promise<any> => {
    return apiClient.post('/api/purchases.php', purchaseData);
  },
};

export const waterLogService = {
  /**
   * Fetch recent water purchases log
   */
  getLogs: async (params?: { month?: number; year?: number }): Promise<any> => {
    return apiClient.get('/api/water_logs.php', { params });
  },

  /**
   * Log a new water purchase event
   */
  logWater: async (): Promise<any> => {
    return apiClient.post('/api/water_logs.php');
  },
};


export const duesService = {
  /**
   * Calculate shared balances and dues
   */
  getDues: async (params?: { month?: number; year?: number }): Promise<any> => {
    return apiClient.get('/api/dues.php', { params });
  },
  logDue: async (data: { subject: string; amount: number; type: 'give' | 'receive'; other_user: string }): Promise<any> => {
    return apiClient.post('/api/dues.php', data);
  },
  deleteDue: async (id: number): Promise<any> => {
    return apiClient.delete('/api/dues.php', { params: { id } });
  },
};

export const homeService = {
  /**
   * Fetch main ledger dashboard data
   */
  getHomeData: async (params?: { month?: number; year?: number }): Promise<any> => {
    return apiClient.get('/api/home_data.php', { params });
  },
};

export const userService = {
  /**
   * Fetch list of users/roommates
   */
  getUsers: async (): Promise<any> => {
    return apiClient.get('/api/users.php');
  },

  /**
   * Save a base64 profile avatar
   */
  changeAvatar: async (avatarBase64: string): Promise<any> => {
    return apiClient.post('/api/users.php', {
      action: 'change_avatar',
      avatar: avatarBase64,
    });
  },

  /**
   * Change login password
   */
  changePassword: async (passwordData: { current_password?: string; new_password?: string }): Promise<any> => {
    return apiClient.post('/api/users.php', {
      action: 'change_password',
      ...passwordData,
    });
  },
};

export default apiClient;
