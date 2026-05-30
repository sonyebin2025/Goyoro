import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// Safely retrieve configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
export const db = getFirestore(app, databaseId);
export const auth = getAuth();


// Error logging operation types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

// Global safe error wrapping handler conformant to system guidelines
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'custom-offline-id',
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error Diagnostics logged:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Record interface for synchronization
export interface FirestoreUser {
  nickname: string;
  name: string;
  password?: string;
  secretAnswer?: string;
  avatar: string;
  points: number;
  todayMinutes: number;
  revealedSpotIds: string[];
  updatedAt: string;
}

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfileToFirestore(user: FirestoreUser): Promise<void> {
  const userPath = `users/${user.nickname.toLowerCase().trim()}`;
  try {
    const userDocRef = doc(db, 'users', user.nickname.toLowerCase().trim());
    await setDoc(userDocRef, {
      nickname: user.nickname,
      name: user.name,
      password: user.password || '',
      secretAnswer: user.secretAnswer || '',
      avatar: user.avatar,
      points: user.points,
      todayMinutes: user.todayMinutes,
      revealedSpotIds: user.revealedSpotIds || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

/**
 * Fetch a user profile from Firestore (to load on other devices)
 */
export async function fetchUserProfileFromFirestore(nickname: string): Promise<FirestoreUser | null> {
  const userPath = `users/${nickname.toLowerCase().trim()}`;
  try {
    const userDocRef = doc(db, 'users', nickname.toLowerCase().trim());
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreUser;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
    return null;
  }
}

/**
 * Retrieve current real-time leaderboard rankings sorted by points descending
 */
export async function fetchLiveRankingsFromFirestore(): Promise<FirestoreUser[]> {
  const usersPath = 'users';
  try {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    const users: FirestoreUser[] = [];
    querySnapshot.forEach((docSnap) => {
      users.push(docSnap.data() as FirestoreUser);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, usersPath);
    return [];
  }
}
