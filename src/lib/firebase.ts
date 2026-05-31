/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 100% Offline Local Datastore implementation for high reliability in isolated preview sandboxes.
// Firebase SDK initializers are completely omitted to prevent CORB, CORS, missing-credential blocks, and page crashes.

export let db: any = null;
export let auth: any = null;

// Error logging operation types (for fallback interface compatibility)
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'custom-offline-id',
      email: 'guest@goyo.wellness',
      emailVerified: true,
    },
    operationType,
    path
  };
  console.warn('Simulated Local Firestore Error logged:', JSON.stringify(errInfo));
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

// Helper methods for localStorage-backed database
function getLocalStorageUsers(): FirestoreUser[] {
  try {
    const list = localStorage.getItem('goyo_offline_users_db');
    if (list) return JSON.parse(list) as FirestoreUser[];
  } catch (e) {
    console.error('Failed to read local users database:', e);
  }
  // Seeding default mock users so the leaderboards still feel alive and interactive!
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
 * Sync user profile to LocalStorage Offline Database
 */
export async function syncUserProfileToFirestore(user: FirestoreUser): Promise<void> {
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
}

/**
 * Fetch a user profile from LocalStorage Offline Database
 */
export async function fetchUserProfileFromFirestore(nickname: string): Promise<FirestoreUser | null> {
  const users = getLocalStorageUsers();
  const cleanNickname = nickname.toLowerCase().trim();
  const matched = users.find(u => u.nickname.toLowerCase().trim() === cleanNickname);
  return matched || null;
}

/**
 * Retrieve current rankings sorted by points descending from Offline Database
 */
export async function fetchLiveRankingsFromFirestore(): Promise<FirestoreUser[]> {
  const users = getLocalStorageUsers();
  return [...users].sort((a, b) => b.points - a.points);
}
