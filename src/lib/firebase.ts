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

// Check if Firebase configuration is fully supplied
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

let app: any;
export let db: any;
export let auth: any;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, databaseId);
    auth = getAuth();
  } catch (error) {
    console.error('Failed to initialize Firebase SDK:', error);
  }
} else {
  console.warn('Firebase VITE_ENV variables missing. Switched to offline localStorage database fallback.');
}

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
      userId: auth?.currentUser?.uid || 'custom-offline-id',
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
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

// Helper methods for localStorage-backed offline DB sync
function getLocalStorageUsers(): FirestoreUser[] {
  try {
    const list = localStorage.getItem('goyo_offline_users_db');
    if (list) return JSON.parse(list) as FirestoreUser[];
  } catch (e) {
    console.error('Failed to read local users database:', e);
  }
  // Default seeding list (INITIAL_RANKINGS equivalents to make the leaderboards feel live)
  const defaultSeeds: FirestoreUser[] = [
    { nickname: '국립숲체원다람쥐', name: '국립숲체원다람쥐', avatar: '🐿️', points: 1450, todayMinutes: 120, revealedSpotIds: [], updatedAt: new Date().toISOString() },
    { nickname: '안흥찐빵할머니', name: '안흥찐빵할머니', avatar: '👵', points: 1200, todayMinutes: 85, revealedSpotIds: [], updatedAt: new Date().toISOString() },
    { nickname: '태기산풍력수호대', name: '태기산풍력수호대', avatar: '🍃', points: 950, todayMinutes: 45, revealedSpotIds: [], updatedAt: new Date().toISOString() },
    { nickname: '섬강한우대장', name: '섬강한우대장', avatar: '🐂', points: 720, todayMinutes: 30, revealedSpotIds: [], updatedAt: new Date().toISOString() }
  ];
  return defaultSeeds;
}

function saveLocalStorageUsers(users: FirestoreUser[]) {
  try {
    localStorage.setItem('goyo_offline_users_db', JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save local users database:', e);
  }
}

/**
 * Sync user profile to Firestore (with localStorage fallback)
 */
export async function syncUserProfileToFirestore(user: FirestoreUser): Promise<void> {
  const userPath = `users/${user.nickname.toLowerCase().trim()}`;
  
  if (!isFirebaseConfigured) {
    // Offline mode: Sync in localStorage
    const users = getLocalStorageUsers();
    const cleanNickname = user.nickname.toLowerCase().trim();
    const existingIndex = users.findIndex(u => u.nickname.toLowerCase().trim() === cleanNickname);
    
    const updatedUser: FirestoreUser = {
      ...user,
      nickname: user.nickname,
      name: user.name,
      avatar: user.avatar,
      points: user.points,
      todayMinutes: user.todayMinutes,
      revealedSpotIds: user.revealedSpotIds || [],
      updatedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...updatedUser };
    } else {
      users.push(updatedUser);
    }
    
    saveLocalStorageUsers(users);
    return;
  }

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
 * Fetch a user profile from Firestore (with localStorage fallback)
 */
export async function fetchUserProfileFromFirestore(nickname: string): Promise<FirestoreUser | null> {
  const userPath = `users/${nickname.toLowerCase().trim()}`;
  
  if (!isFirebaseConfigured) {
    // Offline mode: Retrieve from localStorage
    const users = getLocalStorageUsers();
    const cleanNickname = nickname.toLowerCase().trim();
    const matched = users.find(u => u.nickname.toLowerCase().trim() === cleanNickname);
    return matched || null;
  }

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
 * Retrieve current rankings sorted by points descending (with localStorage fallback)
 */
export async function fetchLiveRankingsFromFirestore(): Promise<FirestoreUser[]> {
  const usersPath = 'users';
  
  if (!isFirebaseConfigured) {
    // Offline mode: Sort offline users
    const users = getLocalStorageUsers();
    return [...users].sort((a, b) => b.points - a.points);
  }

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
