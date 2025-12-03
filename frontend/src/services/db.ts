import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { EggState, EggEvent } from '@/types';

interface EggsRegacoDBSchema extends DBSchema {
  eggState: {
    key: string;
    value: EggState;
  };
  processedImages: {
    key: string;
    value: {
      id: string;
      url: string;
      timestamp: string;
      eventId: string;
    };
    indexes: { 'by-timestamp': string };
  };
  events: {
    key: string;
    value: EggEvent;
    indexes: { 'by-timestamp': string; 'by-boxId': string };
  };
}

const DB_NAME = 'eggs-regaco-db';
const DB_VERSION = 1;
const MAX_IMAGES = 20;

let dbPromise: Promise<IDBPDatabase<EggsRegacoDBSchema>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<EggsRegacoDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Egg state store
        if (!db.objectStoreNames.contains('eggState')) {
          db.createObjectStore('eggState');
        }

        // Processed images store
        if (!db.objectStoreNames.contains('processedImages')) {
          const imageStore = db.createObjectStore('processedImages', { keyPath: 'id' });
          imageStore.createIndex('by-timestamp', 'timestamp');
        }

        // Events store
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('by-timestamp', 'timestamp');
          eventStore.createIndex('by-boxId', 'boxId');
        }
      },
    });
  }
  return dbPromise;
};

// Egg State operations
export const saveEggState = async (state: EggState): Promise<void> => {
  const db = await getDB();
  await db.put('eggState', state, 'current');
};

export const getLastEggState = async (): Promise<EggState | undefined> => {
  const db = await getDB();
  return db.get('eggState', 'current');
};

// Processed Images operations
export const saveProcessedImage = async (
  id: string,
  url: string,
  eventId: string
): Promise<void> => {
  const db = await getDB();
  
  await db.put('processedImages', {
    id,
    url,
    timestamp: new Date().toISOString(),
    eventId,
  });

  // Clean up old images if over limit
  const tx = db.transaction('processedImages', 'readwrite');
  const index = tx.store.index('by-timestamp');
  const allImages = await index.getAll();
  
  if (allImages.length > MAX_IMAGES) {
    const toDelete = allImages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, allImages.length - MAX_IMAGES);
    
    for (const img of toDelete) {
      await tx.store.delete(img.id);
    }
  }
  
  await tx.done;
};

export const getProcessedImages = async (): Promise<
  Array<{ id: string; url: string; timestamp: string; eventId: string }>
> => {
  const db = await getDB();
  const index = db.transaction('processedImages').store.index('by-timestamp');
  return (await index.getAll()).reverse();
};

// Events operations
export const saveEvent = async (event: EggEvent): Promise<void> => {
  const db = await getDB();
  await db.put('events', event);
};

export const getEvents = async (): Promise<EggEvent[]> => {
  const db = await getDB();
  const index = db.transaction('events').store.index('by-timestamp');
  return (await index.getAll()).reverse();
};

export const getEventsByBoxId = async (boxId: string): Promise<EggEvent[]> => {
  const db = await getDB();
  const index = db.transaction('events').store.index('by-boxId');
  return (await index.getAll(boxId)).reverse();
};

export const getCachedEvent = async (eventId: string): Promise<EggEvent | undefined> => {
  const db = await getDB();
  return db.get('events', eventId);
};

// Clear all data
export const clearAllData = async (): Promise<void> => {
  const db = await getDB();
  await db.clear('eggState');
  await db.clear('processedImages');
  await db.clear('events');
};
