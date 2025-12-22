/**
 * IndexedDB Storage for Images
 * 
 * Provides IndexedDB storage for store-specific images.
 * Images are stored per store to support multi-store functionality.
 * 
 * AI Note: This is set up for future use. Currently, images are not
 * being stored, but the structure is ready when needed.
 */

const DB_NAME = 'fusion_storage'
const DB_VERSION = 3 // Increment to force upgrade
const STORE_NAME = 'images'
const VECTOR_STORE_NAME = 'vectorData'

export interface StoredImage {
  id: string
  storeId: string
  imageData: Blob
  mimeType: string
  filename: string
  uploadedAt: Date
  size: number
}

let dbInstance: IDBDatabase | null = null

/**
 * Delete the IndexedDB database completely
 */
export async function deleteDatabase(): Promise<void> {
  // Close existing connection first
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Failed to delete database'))
    request.onblocked = () => {
      console.warn('Database deletion blocked - other connections open')
      resolve() // Continue anyway
    }
  })
}

/**
 * Initialize IndexedDB database
 */
export async function initIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    // Verify the instance has the required object stores
    if (dbInstance.objectStoreNames.contains(VECTOR_STORE_NAME)) {
      return dbInstance
    }
    // Close stale connection
    dbInstance.close()
    dbInstance = null
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = async (event) => {
      console.error('IndexedDB open error, attempting to recreate database')
      try {
        await deleteDatabase()
        // Try again after deletion
        const retryRequest = indexedDB.open(DB_NAME, DB_VERSION)
        retryRequest.onerror = () => reject(new Error('Failed to open IndexedDB after recreation'))
        retryRequest.onsuccess = () => {
          dbInstance = retryRequest.result
          resolve(dbInstance)
        }
        retryRequest.onupgradeneeded = (event) => createObjectStores(event)
      } catch (e) {
        reject(new Error('Failed to open IndexedDB'))
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      
      // Verify object stores exist - if not, we need to recreate
      if (!dbInstance.objectStoreNames.contains(VECTOR_STORE_NAME)) {
        console.warn('Missing object stores, will recreate database on next access')
        dbInstance.close()
        dbInstance = null
        // Trigger recreation by increasing version
        deleteDatabase().then(() => {
          initIndexedDB().then(resolve).catch(reject)
        }).catch(reject)
        return
      }
      
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => createObjectStores(event)
  })
}

function createObjectStores(event: IDBVersionChangeEvent) {
  const db = (event.target as IDBOpenDBRequest).result

  // Create images object store if it doesn't exist
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    
    // Create indexes for efficient querying
    objectStore.createIndex('storeId', 'storeId', { unique: false })
    objectStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
  }
  
  // Create vector data object store if it doesn't exist
  if (!db.objectStoreNames.contains(VECTOR_STORE_NAME)) {
    const vectorStore = db.createObjectStore(VECTOR_STORE_NAME, { keyPath: 'id' })
    vectorStore.createIndex('storeId', 'storeId', { unique: false })
    vectorStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
  }
}

/**
 * Store an image for a specific store
 */
export async function storeImage(
  storeId: string,
  imageData: Blob,
  filename: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const db = await initIndexedDB()
  const id = `${storeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const image: StoredImage = {
    id,
    storeId,
    imageData,
    mimeType,
    filename,
    uploadedAt: new Date(),
    size: imageData.size,
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(image)

    request.onsuccess = () => {
      resolve(id)
    }

    request.onerror = () => {
      reject(new Error('Failed to store image'))
    }
  })
}

/**
 * Get an image by ID
 */
export async function getImage(imageId: string): Promise<StoredImage | null> {
  const db = await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(imageId)

    request.onsuccess = () => {
      resolve(request.result || null)
    }

    request.onerror = () => {
      reject(new Error('Failed to get image'))
    }
  })
}

/**
 * Get image data URL from stored image
 */
export async function getImageDataUrl(imageId: string): Promise<string | null> {
  const image = await getImage(imageId)
  if (!image) return null
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error('Failed to read image'))
    }
    reader.readAsDataURL(image.imageData)
  })
}

/**
 * Load map image from localStorage (handles both direct base64 and IndexedDB references)
 */
export async function loadMapImage(storageKey: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return null
    
    // Check if it's an IndexedDB reference
    if (stored.startsWith('indexeddb:')) {
      const imageId = stored.replace('indexeddb:', '')
      return await getImageDataUrl(imageId)
    }
    
    // Otherwise, it's a direct base64 string (for small images)
    return stored
  } catch (error) {
    console.error('Failed to load map image:', error)
    return null
  }
}

/**
 * Get all images for a specific store
 */
export async function getStoreImages(storeId: string): Promise<StoredImage[]> {
  const db = await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('storeId')
    const request = index.getAll(storeId)

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(new Error('Failed to get store images'))
    }
  })
}

/**
 * Delete an image
 */
export async function deleteImage(imageId: string): Promise<void> {
  const db = await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(imageId)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(new Error('Failed to delete image'))
    }
  })
}

/**
 * Delete all images for a specific store
 */
export async function deleteStoreImages(storeId: string): Promise<void> {
  const db = await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('storeId')
    const request = index.openCursor(IDBKeyRange.only(storeId))

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }

    request.onerror = () => {
      reject(new Error('Failed to delete store images'))
    }
  })
}

/**
 * Get total storage size for a store (in bytes)
 */
export async function getStoreImageSize(storeId: string): Promise<number> {
  const images = await getStoreImages(storeId)
  return images.reduce((total, image) => total + image.size, 0)
}

/**
 * Store vector data for a specific store
 * Uses IndexedDB to handle large datasets that exceed localStorage limits
 */
export async function storeVectorData(
  storeId: string,
  vectorData: any,
  key: string
): Promise<void> {
  const db = await initIndexedDB()
  const id = `${storeId}-${key}`
  
  // Convert to JSON string and then to Blob for efficient storage
  const jsonString = JSON.stringify(vectorData)
  const blob = new Blob([jsonString], { type: 'application/json' })
  
  const data = {
    id,
    storeId,
    key,
    vectorData: blob,
    uploadedAt: new Date(),
    size: blob.size,
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VECTOR_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(VECTOR_STORE_NAME)
    const request = store.put(data) // Use put to overwrite if exists

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(new Error('Failed to store vector data'))
    }
  })
}

/**
 * Get vector data by store ID and key
 */
export async function getVectorData(
  storeId: string,
  key: string
): Promise<any | null> {
  const db = await initIndexedDB()
  const id = `${storeId}-${key}`

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VECTOR_STORE_NAME], 'readonly')
    const store = transaction.objectStore(VECTOR_STORE_NAME)
    const request = store.get(id)

    request.onsuccess = async () => {
      const result = request.result
      if (!result) {
        resolve(null)
        return
      }
      
      // Convert Blob back to JSON
      try {
        const text = await result.vectorData.text()
        const vectorData = JSON.parse(text)
        resolve(vectorData)
      } catch (error) {
        reject(new Error('Failed to parse vector data'))
      }
    }

    request.onerror = () => {
      reject(new Error('Failed to get vector data'))
    }
  })
}

/**
 * Delete vector data for a specific store and key
 */
export async function deleteVectorData(
  storeId: string,
  key: string
): Promise<void> {
  const db = await initIndexedDB()
  const id = `${storeId}-${key}`

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VECTOR_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(VECTOR_STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(new Error('Failed to delete vector data'))
    }
  })
}

