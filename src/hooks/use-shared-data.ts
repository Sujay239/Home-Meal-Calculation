import { useState, useEffect } from 'react';
import { userService } from '@/services/api';
import { useAuth } from './use-auth';

export type Purchase = {
  id: number;
  username: string;
  product: string;
  price: number;
  date: Date;
};

// Lightweight observer system to coordinate real-time backend updates
const purchaseUpdateCallbacks = new Set<() => void>();

export const notifyPurchaseAdded = () => {
  purchaseUpdateCallbacks.forEach((cb) => cb());
};

export const subscribeToPurchaseUpdates = (cb: () => void) => {
  purchaseUpdateCallbacks.add(cb);
  return () => {
    purchaseUpdateCallbacks.delete(cb);
  };
};

export interface Roommate {
  id: number;
  username: string;
  role: string;
  avatar: string | null;
}

let cachedRoommates: Roommate[] = [];
let isFetchingRoommates = false;
let lastFetchTime = 0;
const CACHE_TTL_MS = 300000; // 5 minutes cache TTL
const roommateSubscribers = new Set<(state: { roommates: Roommate[]; isLoading: boolean }) => void>();

function notifyRoommateSubscribers(isLoading: boolean) {
  roommateSubscribers.forEach((sub) => sub({ roommates: [...cachedRoommates], isLoading }));
}

export function useRoommates() {
  const { token, isAuthenticated } = useAuth();
  const [state, setState] = useState({
    roommates: cachedRoommates,
    isLoading: isFetchingRoommates,
  });

  const fetchRoommates = async (force = false) => {
    if (!token || !isAuthenticated) return;
    const now = Date.now();
    if (!force && cachedRoommates.length > 0 && (now - lastFetchTime < CACHE_TTL_MS)) {
      return;
    }
    if (isFetchingRoommates) return;

    isFetchingRoommates = true;
    notifyRoommateSubscribers(true);

    try {
      const data = await userService.getUsers();
      if (data.success && Array.isArray(data.users)) {
        cachedRoommates = data.users;
        lastFetchTime = Date.now();
      }
    } catch (err) {
      console.error('[useRoommates] Error fetching roommates:', err);
    } finally {
      isFetchingRoommates = false;
      notifyRoommateSubscribers(false);
    }
  };

  useEffect(() => {
    const handler = (newState: { roommates: Roommate[]; isLoading: boolean }) => {
      setState(newState);
    };
    roommateSubscribers.add(handler);

    if (token && isAuthenticated && cachedRoommates.length === 0) {
      fetchRoommates();
    }

    return () => {
      roommateSubscribers.delete(handler);
    };
  }, [token, isAuthenticated]);

  const getAvatar = (username: string) => {
    const trimmedLower = username.toLowerCase().trim();
    const found = state.roommates.find(r => r.username.toLowerCase().trim() === trimmedLower);
    return found?.avatar || null;
  };

  return {
    roommates: state.roommates,
    isLoading: state.isLoading,
    refreshRoommates: () => fetchRoommates(true),
    getAvatar,
  };
}



