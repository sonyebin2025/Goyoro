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

// Flag to check if we have a valid environment configuration for Firebase
const hasConfig = typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.trim().length > 0;

let app: any = null;
let db: any = null;
let auth: any = null;

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, databaseId);
    auth = getAuth();
    console.log('☘️ Firebase initialized successfully inside safe wrapper.');
  } catch (err) {
    console.error('⚠️ Firebase Initialization failed. Falling back to local offline mode.', err);
    db = null;
    auth = null;
  }
} else {
  console.warn('ℹ️ Firebase API Key is missing. GOYO-RO is running in Safe Offline Local Storage mode.');
}

export { db, auth };


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

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfileToFirestore(user: FirestoreUser): Promise<void> {
  if (!db) {
    const key = `goyo_mock_db_user_${user.nickname.toLowerCase().trim()}`;
    localStorage.setItem(key, JSON.stringify(user));
    return;
  }

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
  if (!db) {
    const key = `goyo_mock_db_user_${nickname.toLowerCase().trim()}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached) as FirestoreUser;
      } catch (_) {
        return null;
      }
    }
    return null;
  }

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
  if (!db) {
    // Return mock rankings merged with the currently active logged-in user profile
    const loggedInUser = localStorage.getItem('goyo_logged_user') || '고요나그네';
    const currentPoints = parseInt(localStorage.getItem('goyo_user_score') || '100', 10);
    const currentAvatar = localStorage.getItem('goyo_user_avatar') || '🧘';
    const currentMins = parseInt(localStorage.getItem('goyo_today_minutes') || '0', 10);
    const cachedSpotsRaw = localStorage.getItem('goyo_secret_spots');
    let revealedSpotIds: string[] = [];
    try {
      if (cachedSpotsRaw) {
        const parsed = JSON.parse(cachedSpotsRaw);
        revealedSpotIds = parsed.filter((s: any) => s.isRevealed).map((s: any) => s.id);
      }
    } catch (_) {}

    const initialMockRankings: FirestoreUser[] = [
      { nickname: '횡성스피릿벨', name: '횡성스피릿벨', points: 1250, avatar: '🌟', todayMinutes: 45, revealedSpotIds: [], updatedAt: '' },
      { nickname: '안흥찐빵매니아', name: '안흥찐빵매니아', points: 1080, avatar: '🥟', todayMinutes: 30, revealedSpotIds: [], updatedAt: '' },
      { nickname: '한우마스터1', name: '한우마스터1', points: 950, avatar: '🐮', todayMinutes: 20, revealedSpotIds: [], updatedAt: '' },
      { nickname: '숲체원워커', name: '숲체원워커', points: 840, avatar: '🌲', todayMinutes: 15, revealedSpotIds: [], updatedAt: '' },
      { nickname: '정령스피커', name: '정령스피커', points: 720, avatar: '✨', todayMinutes: 12, revealedSpotIds: [], updatedAt: '' },
      { nickname: '자연바람나그네', name: '자연바람나그네', points: 650, avatar: '🍃', todayMinutes: 10, revealedSpotIds: [], updatedAt: '' },
      { nickname: '섬강오리', name: '섬강오리', points: 590, avatar: '🦆', todayMinutes: 5, revealedSpotIds: [], updatedAt: '' },
      { nickname: '태기산등반러', name: '태기산등반러', points: 550, avatar: '🏔️', todayMinutes: 0, revealedSpotIds: [], updatedAt: '' },
      { nickname: '고양이풀', name: '고양이풀', points: 490, avatar: '🐱', todayMinutes: 0, revealedSpotIds: [], updatedAt: '' },
      { nickname: '도토리수장', name: '도토리수장', points: 480, avatar: '🐿️', todayMinutes: 0, revealedSpotIds: [], updatedAt: '' },
      { nickname: '찐빵러브', name: '찐빵러브', points: 450, avatar: '❤️', todayMinutes: 0, revealedSpotIds: [], updatedAt: '' },
      { nickname: '안흥찐빵메이커', name: '안흥찐빵메이커', points: 420, avatar: '🥟', todayMinutes: 0, revealedSpotIds: [], updatedAt: '' },
      { nickname: '도토리수령자', name: '도토리수령자', points: 320, avatar: '🐿️', todayMinutes: 0, revealedSpotIds: [], updatedAt: '' },
      { nickname: '아침이슬향기', name: '아침이슬향기', points: 210, avatar: '💧', todayMinutes: 0, revealedSpotIds: [], updatedAt: '' },
    ];

    const myKey = `goyo_mock_db_user_${loggedInUser.toLowerCase().trim()}`;
    const myProfileLocal = localStorage.getItem(myKey);
    let myFirestoreUser: FirestoreUser;

    if (myProfileLocal) {
      try {
        myFirestoreUser = JSON.parse(myProfileLocal);
      } catch (_) {
        myFirestoreUser = {
          nickname: loggedInUser,
          name: loggedInUser,
          points: currentPoints,
          avatar: currentAvatar,
          todayMinutes: currentMins,
          revealedSpotIds,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      myFirestoreUser = {
        nickname: loggedInUser,
        name: loggedInUser,
        points: currentPoints,
        avatar: currentAvatar,
        todayMinutes: currentMins,
        revealedSpotIds,
        updatedAt: new Date().toISOString()
      };
    }

    // Filter out duplicate user profile to ensure uniqueness
    const filteredMock = initialMockRankings.filter(u => u.nickname.toLowerCase().trim() !== loggedInUser.toLowerCase().trim());
    filteredMock.push(myFirestoreUser);

    // Sort descending by points
    filteredMock.sort((a, b) => b.points - a.points);
    return filteredMock;
  }

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
