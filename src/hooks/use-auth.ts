import { useState, useEffect } from 'react';
import { Storage } from '@/utils/storage';

export interface User {
  id: number;
  username: string;
  role: string;
  avatar: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  username: string;
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

const subscribers = new Set<(state: AuthState) => void>();

let currentAuthState: AuthState = {
  isAuthenticated: false,
  username: '',
  user: null,
  token: null,
  isLoading: true,
};

let hasInitialized = false;

// Auto-initialize from storage
async function initializeAuth() {
  if (hasInitialized) return;
  hasInitialized = true;
  
  try {
    const token = await Storage.getItem('auth_token');
    const userJson = await Storage.getItem('auth_user');
    
    if (token && userJson) {
      const user = JSON.parse(userJson);
      currentAuthState = {
        isAuthenticated: true,
        username: user.username,
        user,
        token,
        isLoading: false,
      };
    } else {
      currentAuthState = {
        isAuthenticated: false,
        username: '',
        user: null,
        token: null,
        isLoading: false,
      };
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    currentAuthState = {
      isAuthenticated: false,
      username: '',
      user: null,
      token: null,
      isLoading: false,
    };
  } finally {
    notifySubscribers();
  }
}

function notifySubscribers() {
  subscribers.forEach((sub) => sub({ ...currentAuthState }));
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(currentAuthState);

  useEffect(() => {
    // If not initialized, start loading
    if (!hasInitialized) {
      initializeAuth();
    }

    const handler = (newState: AuthState) => {
      setState(newState);
    };
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  const login = async (token: string, user: User) => {
    const jwtToken = token || 'dummy_token';
    try {
      await Storage.setItem('auth_token', jwtToken);
      await Storage.setItem('auth_user', JSON.stringify(user));
      
      currentAuthState = {
        isAuthenticated: true,
        username: user.username,
        user,
        token: jwtToken,
        isLoading: false,
      };
      notifySubscribers();
    } catch (e) {
      console.error('Error during login save:', e);
    }
  };

  const logout = async () => {
    try {
      await Storage.removeItem('auth_token');
      await Storage.removeItem('auth_user');
      
      currentAuthState = {
        isAuthenticated: false,
        username: '',
        user: null,
        token: null,
        isLoading: false,
      };
      notifySubscribers();
    } catch (e) {
      console.error('Error during logout:', e);
    }
  };

  const updateUser = async (user: User) => {
    try {
      await Storage.setItem('auth_user', JSON.stringify(user));
      currentAuthState = {
        ...currentAuthState,
        user,
        username: user.username,
      };
      notifySubscribers();
    } catch (e) {
      console.error('Error updating user storage:', e);
    }
  };

  return {
    isAuthenticated: state.isAuthenticated,
    username: state.username,
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    login,
    logout,
    updateUser,
  };
}
