export interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: any;
  timestamp: number;
}

const QUEUE_KEY = 'krumos_offline_queue';

export const getOfflineQueue = (): QueuedRequest[] => {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveOfflineQueue = (queue: QueuedRequest[]): void => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue', e);
  }
};

export const enqueueRequest = (
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: any
): void => {
  const queue = getOfflineQueue();

  // Prevent duplicate submissions by checking if there's an identical request in the queue
  const isDuplicate = queue.some(
    (req) =>
      req.url === url &&
      req.method === method &&
      JSON.stringify(req.body) === JSON.stringify(body)
  );

  if (isDuplicate) {
    console.log('Skipping duplicate offline queued request', { url, method });
    return;
  }

  const newRequest: QueuedRequest = {
    id: Math.random().toString(36).substring(2, 9),
    url,
    method,
    body,
    timestamp: Date.now(),
  };

  queue.push(newRequest);
  saveOfflineQueue(queue);
  console.log('Request queued offline successfully:', newRequest);
};

export const clearQueuedRequest = (id: string): void => {
  const queue = getOfflineQueue();
  const filtered = queue.filter((req) => req.id !== id);
  saveOfflineQueue(filtered);
};

export const flushQueue = async (api: {
  post: (url: string, body?: any, config?: any) => Promise<any>;
  patch: (url: string, body?: any, config?: any) => Promise<any>;
  delete: (url: string, config?: any) => Promise<any>;
}): Promise<void> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`Flushing offline queue with ${queue.length} items...`);
  const items = [...queue];

  for (const item of items) {
    try {
      if (item.method === 'POST') {
        await api.post(item.url, item.body, { skipQueue: true });
      } else if (item.method === 'PATCH') {
        await api.patch(item.url, item.body, { skipQueue: true });
      } else if (item.method === 'DELETE') {
        await api.delete(item.url, { skipQueue: true });
      }
      clearQueuedRequest(item.id);
      console.log(`Successfully synced queued request ${item.id}: ${item.method} ${item.url}`);
    } catch (e: any) {
      console.error(`Failed to sync queued request ${item.id}: ${item.method} ${item.url}`, e);
      
      const status = e?.response?.status;
      // Discard invalid requests (4xx status, excluding auth/timeout retryable statuses)
      if (status && status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429) {
        clearQueuedRequest(item.id);
        console.log(`Discarded invalid request ${item.id} due to client error status ${status}`);
      } else {
        // Server error or network error: stop flushing and retry later
        break;
      }
    }
  }
};
export default flushQueue;
