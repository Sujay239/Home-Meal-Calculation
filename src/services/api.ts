import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Storage } from '@/utils/storage';
import { getBypassCookie } from '@/utils/challengeSolver';

// --------------------------------------------------------------
// 1. Dynamic API Base URL Configuration
// --------------------------------------------------------------
// For local development on physical devices, update this with your computer's LAN IP address!
const DEVELOPMENT_LAN_IP = '10.229.201.238'; 

// Set this to true to test the app using your hosted server (e.g. kolkata-room.gamer.gd).
// Set this to false if you are running the backend server locally using XAMPP or run_backend.bat.
const USE_PRODUCTION_IN_DEV = true;



const getBaseUrl = () => {
  if (__DEV__ && !USE_PRODUCTION_IN_DEV) {
    // If running in the web browser locally
    if (Platform.OS === 'web') {
      return 'http://localhost/Home-Meal-Calculation/backend';
    }
    // Fallback logic for emulators & physical devices
    const hostUri = Constants.expoConfig?.hostUri || '';
    const uriHost = hostUri.split(':')[0];
    if (uriHost && !uriHost.includes('exp.direct') && !uriHost.includes('ngrok')) {
      return `http://${uriHost}:8000`;
    }
    return `http://${DEVELOPMENT_LAN_IP}:8000`;
  }
  // Production API Endpoint (InfinityFree Host)
  return 'http://kolkata-room.gamer.gd';
};

const API_BASE_URL = getBaseUrl();

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
// 3. Request Interceptor (Cookie Bypass & JWT Injection)
// --------------------------------------------------------------
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Inject the bypass cookie for InfinityFree if applicable
    if (config.baseURL?.includes('gamer.gd') || config.url?.includes('gamer.gd')) {
      try {
        const cookie = await getBypassCookie(config.baseURL || 'http://kolkata-room.gamer.gd');
        if (cookie) {
          config.headers['Cookie'] = `__test=${cookie}`;
        }
      } catch (cookieError) {
        console.warn('[API Client] Cookie bypass failed:', cookieError);
      }
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
// 4. Response Interceptor (Global Error Handling)
// --------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API Response] Success from ${response.config.url}`);
    }
    return response.data;
  },
  (error) => {
    const errorMsg = error.response?.data?.message || error.message || 'An unknown network error occurred';

    if (__DEV__) {
      console.warn(`[API Error] Details:`, error.response?.data || error.message);
    }

    return Promise.reject({
      status: error.response?.status,
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

export const duesService = {
  /**
   * Calculate shared balances and dues
   */
  getDues: async (params?: { month?: number; year?: number }): Promise<any> => {
    return apiClient.get('/api/dues.php', { params });
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
