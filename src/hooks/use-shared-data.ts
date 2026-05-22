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


