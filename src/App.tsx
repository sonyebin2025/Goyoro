/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Home, 
  Map as MapIcon, 
  Sprout, 
  BookOpen, 
  User, 
  Lock, 
  Unlock, 
  Gift, 
  Trophy, 
  Volume2, 
  Mail, 
  Key, 
  PenTool, 
  X, 
  LogOut, 
  Play, 
  Pause, 
  ChevronRight, 
  Check, 
  Heart, 
  Sparkles, 
  Star, 
  AlertTriangle, 
  Moon, 
  Coffee, 
  ShieldAlert, 
  Footprints, 
  MessageSquare,
  Clock,
  Camera,
  Compass,
  CheckCircle2,
  LockKeyhole,
  Info,
  HelpCircle,
  Search,
  RefreshCw,
  Mic
} from 'lucide-react';
import { sounds } from './utils/audio';
import { TransparentImage } from './components/TransparentImage';
import { 
  Spirit, 
  INITIAL_SPIRITS, 
  Course, 
  INITIAL_COURSES, 
  Coupon, 
  ALL_COUPONS_POOL, 
  RankingUser, 
  INITIAL_RANKINGS, 
  SecretSpot, 
  INITIAL_SECRET_SPOTS, 
  SpiritLetter, 
  SPIRIT_LETTERS, 
  JournalLog, 
  INITIAL_JOURNAL_LOGS 
} from './types';
import { 
  syncUserProfileToFirestore, 
  fetchUserProfileFromFirestore, 
  fetchLiveRankingsFromFirestore 
} from './lib/firebase';
const goyoLogo = "https://blog.kakaocdn.net/dna/ZbKt7/dJMcafmv9cn/AAAAAAAAAAAAAAAAAAAAAMHjjcyPeA3imB-yRCujfn8DnCa4j1InhnUiVuIAnsbA/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1780239599&allow_ip=&allow_referer=&signature=A66fFzOeSIXnsjq3Nkcgh5g0Qvc%3D";

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [userPasswordInput, setUserPasswordInput] = useState<string>('');
  
  // Custom Registration / Signup State
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'find_password'>('login');
  const [signupNickname, setSignupNickname] = useState<string>('');
  const [signupName, setSignupName] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupSecretAnswer, setSignupSecretAnswer] = useState<string>('');

  // Firestore Synchronization & User Custom Profile States
  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem('goyo_user_avatar') || '🧘');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileEditNickname, setProfileEditNickname] = useState<string>('');
  const [profileEditAvatar, setProfileEditAvatar] = useState<string>('🧘');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('아직 진행되지 않음');

  // Space-Sensing Camera Depth & AR Mapping States
  const [isArCameraOpen, setIsArCameraOpen] = useState<boolean>(false);
  const [arTargetSpirits, setArTargetSpirits] = useState<Array<{ id: string; name: string; emoji: string; x: number; y: number; z: number; color: string }>>([]);
  const [arDepthTarget, setArDepthTarget] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isArScanning, setIsArScanning] = useState<boolean>(false);

  // Password Recovery state
  const [findPasswordNickname, setFindPasswordNickname] = useState<string>('');
  const [findPasswordName, setFindPasswordName] = useState<string>('');
  const [findPasswordSecretAnswer, setFindPasswordSecretAnswer] = useState<string>('');
  const [foundPasswordResult, setFoundPasswordResult] = useState<string | null>(null);

  // Form Warnings / Inline Status Feedbacks
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [findPasswordError, setFindPasswordError] = useState<string | null>(null);
  
  // Ref for the real interactive Leaflet map instance
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapMarkersRef = useRef<any[]>([]);
  const activeAudioCtxRef = useRef<any>(null);

  // App Navigation States
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'garden' | 'records' | 'profile'>('home');
  const [isTaxiInfoExpanded, setIsTaxiInfoExpanded] = useState<boolean>(false);
  const [score, setScore] = useState<number>(100); // base score (initialized to 100pt as requested)
  const [walkedKm, setWalkedKm] = useState<number>(() => {
    const saved = localStorage.getItem('goyo_walked_km');
    if (saved) return parseFloat(saved);
    return 1.2;
  });
  const [showQuestPromptModal, setShowQuestPromptModal] = useState<boolean>(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Sound Utility wrapper
  const triggerClick = () => {
    sounds.playClick();
  };

  // State Store
  const [spirits, setSpirits] = useState<Spirit[]>(() => {
    const saved = localStorage.getItem('goyo_spirits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Spirit[];
        return parsed.map(s => {
          const match = INITIAL_SPIRITS.find(init => init.id === s.id);
          if (match && match.imageUrl) {
            return { ...s, imageUrl: match.imageUrl };
          }
          return s;
        });
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_SPIRITS;
  });
  const [selectedSpirit, setSelectedSpirit] = useState<Spirit>(() => {
    const saved = localStorage.getItem('goyo_spirits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Spirit[];
        if (parsed && parsed.length > 0) {
          const s = parsed[0];
          const match = INITIAL_SPIRITS.find(init => init.id === s.id);
          if (match && match.imageUrl) {
            return { ...s, imageUrl: match.imageUrl };
          }
          return s;
        }
      } catch (e) {}
    }
    return INITIAL_SPIRITS[0];
  });
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);

  // Mystic Spirit Egg Incubation State (폰 뒤집어 부화하기 기능)
  const [eggHatchProgress, setEggHatchProgress] = useState<number>(0);
  const [isPhoneFaceDown, setIsPhoneFaceDown] = useState<boolean>(false);
  const [lastHatchedSpirit, setLastHatchedSpirit] = useState<string | null>(null);
  
  // Dedicated Feed Inventory (can be farmed via timer completion or bought with Goyo points)
  const [feedCount, setFeedCount] = useState<number>(5);
  
  // Selected Map Course is what opens the slide drawer or Bottom Sheet
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);

  const [visitedCourseIds, setVisitedCourseIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('goyo_visited_course_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return ['c1']; // Seed c1 ('찐빵길') as already visited, while 'c2' (피톤치드길) is not visited yet
  });
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [letters, setLetters] = useState<SpiritLetter[]>([]);
  const [rankings, setRankings] = useState<RankingUser[]>(INITIAL_RANKINGS);
  const [secretSpots, setSecretSpots] = useState<SecretSpot[]>(INITIAL_SECRET_SPOTS);
  const [logs, setLogs] = useState<JournalLog[]>(INITIAL_JOURNAL_LOGS);

  // Home Screen Quest Modal
  const [activeQuest, setActiveQuest] = useState<{name: string, sub: string, desc: string, icon: string, reward: string, points: number} | null>(null);

  // Timer properties for detox
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(1500); // 25:00
  const [timerTotal, setTimerTotal] = useState<number>(1500);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [todayMinutes, setTodayMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('goyo_today_minutes');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Release Animation Trigger State
  const [releasingSpirit, setReleasingSpirit] = useState<Spirit | null>(null);
  const [isReleaseAnimating, setIsReleaseAnimating] = useState<boolean>(false);
  const [newlyAwardedCoupon, setNewlyAwardedCoupon] = useState<Coupon | null>(null);

  // Records Tab Sub-Navigation
  const [recordsSubTab, setRecordsSubTab] = useState<'ranking' | 'sounds' | 'secrets' | 'letters' | 'logs'>('ranking');

  // Ambient natural synthesis states
  const [playingAuralIndex, setPlayingAuralIndex] = useState<number | null>(null);
  const ambientOscillators = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Camera QR Scanner Modal properties (REAL JS Camera connection!)
  const [scanningSpot, setScanningSpot] = useState<SecretSpot | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<'requesting' | 'streaming' | 'success' | 'failed'>('requesting');
  const [scannerTick, setScannerTick] = useState<number>(3);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // AI Scenic Landscape Recognition Extra states
  const [sceneryAnalysisState, setSceneryAnalysisState] = useState<'idle' | 'analyzing' | 'checked' | 'wrong'>('idle');
  const [sceneryAnalysisText, setSceneryAnalysisText] = useState<string>('');
  const [uploadedSceneryFile, setUploadedSceneryFile] = useState<string | null>(null);

  // Staff Stamp - Coupon verification pin modal states
  const [verifyingCoupon, setVerifyingCoupon] = useState<Coupon | null>(null);
  const [staffPin, setStaffPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // New log creation states
  const [showNewLogModal, setShowNewLogModal] = useState<boolean>(false);
  const [newLogTitle, setNewLogTitle] = useState<string>('');
  const [newLogCourse, setNewLogCourse] = useState<string>('🌲 청태산 피톤치드 치유의 길');
  const [newLogQuote, setNewLogQuote] = useState<string>('');
  const [newLogTime, setNewLogTime] = useState<string>('30분');

  // Course Reviews & Ratings Community State (별점 및 커뮤니티 채팅 후기 반응)
  const [courseReviews, setCourseReviews] = useState<any[]>([
    { id: '1', courseId: 'c1', user: '가마솥찐빵러버', rating: 5, text: '가마솥 안흥찐빵 한입에 횡성의 인심이 그대로 느껴져요! 따끈따끈 강력 추천 코스! 🥟', time: '10분 전' },
    { id: '2', courseId: 'c1', user: '배부른다이어터', rating: 4, text: '천천히 주포천 산책하면서 소화하기 좋은 코스입니다.', time: '1시간 전' },
    { id: '3', courseId: 'c2', user: '숲체원딱따구리', rating: 5, text: '잣나무 향기가 너무 시원하고 무장애 데크가 아주 안전하고 조용해요🌲', time: '15분 전' },
    { id: '4', courseId: 'c2', user: '힐링의꿈', rating: 5, text: '아스팔트 대신에 폭신폭신한 잣나무 이파리 냄새 맡으니 우울증이 물러갑니다.', time: '2시간 전' },
    { id: '5', courseId: 'c3', user: '한우정각산책인', rating: 5, text: '수변가 바람이 참 따뜻해요. 돌담 구경도 하고 미식 탐구까지 일석이조!', time: '15분 전' },
    { id: '6', courseId: 'c4', user: '구름이걷히면', rating: 4, text: '태기산 높이 만큼이나 구름바다 한가운데 서있는 기분이에요! 엄청 장엄합니다. ☁️', time: '6시간 전' }
  ]);
  const [tempRating, setTempRating] = useState<number>(5);
  const [newCommentText, setNewCommentText] = useState<string>('');

  // Daily Quests State and Refresh Indicator (일 1회 미션 새로고침용)
  const [dailyQuests, setDailyQuests] = useState<any[]>([
    { name: '🌲 삼나무 숲소리 한 시간 듣기', sub: '귀로 씻는 소리 샤워', desc: '청태산 치유의 길 숲마당에서 소형 오케스트라 사운드 1회 정취하기', reward: '이슬 기력 +30', points: 40, icon: '🌲' },
    { name: '🥟 가마솥 안흥 찐빵 장독대 방문', sub: '할머니의 귓소문 QR 캡처', desc: '안흥 찐빵 전통 마을 장독대 구역을 수색하여 숨겨진 QR코드 단서 태깅 완료하기', reward: '숨겨진 특별요정 도각', points: 100, icon: '🥟' },
    { name: '💆 태기산 구름풍선에서 단절 숨쉬기', sub: '25분 심호흡 디미스', desc: '태기산 정선 명상 코스에서 디톡스 정화 명상 카운트 타이머 25분 완주하기', reward: '한우 정령 각성 에너지', points: 150, icon: '🌬️' }
  ]);
  const [hasRefreshedQuest, setHasRefreshedQuest] = useState<boolean>(false);

  // Natural Sound Recording States (User natural sound board recording!)
  const [recordedSounds, setRecordedSounds] = useState<any[]>([
    { id: 'rec-1', title: '🍃 숲속 잣나무 바람 소리 들숨 녹음', date: '2026.05.29', duration: '8초' },
    { id: 'rec-2', title: '🐦 아침 주포천 물까치 부르는 소리', date: '2026.05.29', duration: '5초' }
  ]);
  const [isRecordingSound, setIsRecordingSound] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordingIntervalId, setRecordingIntervalId] = useState<any>(null);
  const [playingRecordedId, setPlayingRecordedId] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    // Seed default user if not exists
    const savedUsers = localStorage.getItem('goyo_users');
    if (!savedUsers) {
      localStorage.setItem('goyo_users', JSON.stringify([{
        nickname: 'goyo',
        name: '고요',
        password: 'goyo123!'
      }]));
    }

    const savedUser = localStorage.getItem('goyo_logged_user');
    if (savedUser) {
      setUsername(savedUser);
    }
    setIsLoggedIn(false); // ALWAYS show the elegant login screen first as explicitly requested
    
    // Load local stored score
    const savedScore = localStorage.getItem('goyo_user_score');
    if (savedScore) {
      setScore(parseInt(savedScore, 10));
    } else {
      setScore(100);
      localStorage.setItem('goyo_user_score', '100');
    }

    // Load local stored coupons
    const savedCoupons = localStorage.getItem('goyo_user_coupons');
    if (savedCoupons) {
      try {
        setCoupons(JSON.parse(savedCoupons));
      } catch (e) {
        console.error(e);
      }
    } else {
      // seed initial welcome coupon
      const welcomeCoupon: Coupon = {
        id: 'welcome_1',
        title: '🍵 고요로 웰니스 웰컴 오색티 교환권',
        provider: '카페 고요 (수변숲길점)',
        discount: '들꽃 더덕차 1잔 무료 제공',
        expireDate: '2026.12.31',
        used: false,
        code: 'GOYOWELCOME77'
      };
      setCoupons([welcomeCoupon]);
      localStorage.setItem('goyo_user_coupons', JSON.stringify([welcomeCoupon]));
    }

    // Load custom unlocked trails
    const savedCourses = localStorage.getItem('goyo_courses');
    if (savedCourses) {
      try {
        setCourses(JSON.parse(savedCourses));
      } catch (e) {
        console.error(e);
      }
    }

    // Load secret spots status
    const savedSpots = localStorage.getItem('goyo_secret_spots');
    if (savedSpots) {
      try {
        setSecretSpots(JSON.parse(savedSpots));
      } catch (e) {
        console.error(e);
      }
    }

    // Load feed count state
    const savedFeeds = localStorage.getItem('goyo_feed_count');
    if (savedFeeds) {
      setFeedCount(parseInt(savedFeeds, 10));
    } else {
      setFeedCount(5);
    }

    // Load spirit letters state
    const savedLetters = localStorage.getItem('goyo_user_letters');
    if (savedLetters) {
      try {
        setLetters(JSON.parse(savedLetters));
      } catch (e) {
        console.error(e);
      }
    } else {
      setLetters(SPIRIT_LETTERS);
      localStorage.setItem('goyo_user_letters', JSON.stringify(SPIRIT_LETTERS));
    }
  }, []);

  // Spirits persistence effect
  useEffect(() => {
    localStorage.setItem('goyo_spirits', JSON.stringify(spirits));
  }, [spirits]);

  useEffect(() => {
    localStorage.setItem('goyo_visited_course_ids', JSON.stringify(visitedCourseIds));
  }, [visitedCourseIds]);

  useEffect(() => {
    localStorage.setItem('goyo_today_minutes', todayMinutes.toString());
  }, [todayMinutes]);

  // Real-time Firestore synchronization effect triggered on tab change or actions
  useEffect(() => {
    if (isLoggedIn && username) {
      handleSyncWithFirestore();
    }
  }, [activeTab, isLoggedIn]);

  // Handle device orientation for face-down detection
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta !== null && gamma !== null) {
        // Face down condition: beta close to 180 (or -180) OR gamma close to 180
        // Usually, face-down on a flat table is Math.abs(beta) > 165 or Math.abs(beta) < 15 and Math.abs(gamma) > 165
        const isDown = Math.abs(beta) > 155 || (Math.abs(beta) < 25 && Math.abs(gamma) > 155);
        setIsPhoneFaceDown(isDown);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Incubation / Egg Hatching Timer logic
  useEffect(() => {
    let interval: any = null;
    if (isPhoneFaceDown && eggHatchProgress < 100) {
      interval = setInterval(() => {
        setEggHatchProgress((prev) => {
          const next = prev + 5; // 5% per second (takes 20 seconds of silence to hatch!)
          if (next >= 100) {
            clearInterval(interval);
            sounds.playSuccess();
            
            // Randomly unlock one of the locked spirits
            setSpirits((curr) => {
              const locked = curr.filter(s => !s.isUnlocked);
              if (locked.length > 0) {
                const randIdx = Math.floor(Math.random() * locked.length);
                const chosen = locked[randIdx];
                const updated = curr.map(s => {
                  if (s.id === chosen.id) {
                    return { ...s, isUnlocked: true, energy: 95 }; // starts with high energy
                  }
                  return s;
                });
                setLastHatchedSpirit(chosen.name);
                showToast(`🎉 [${chosen.name}] 정령이 폰을 뒤집어둔 정진 끝에 알에서 부화했습니다! 🥚✨`);
                return updated;
              } else {
                setLastHatchedSpirit("모던 보은");
                showToast(`🎉 모든 고요요정을 부화시켰습니다! 정령들의 합창 소리가 기력을 가득 채웁니다! 🥚💖`);
                return curr.map(s => ({ ...s, energy: Math.min(100, s.energy + 30) }));
              }
            });
            
            // Reward +200 Goyo Wellness points
            setScore((prevScore) => {
              const res = prevScore + 200;
              localStorage.setItem('goyo_user_score', String(res));
              return res;
            });

            return 100;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPhoneFaceDown, eggHatchProgress]);

  // Sync state to local storage helpers
  const saveFeedsToLocal = (newCount: number) => {
    setFeedCount(newCount);
    localStorage.setItem('goyo_feed_count', newCount.toString());
  };

  const saveCouponsToLocal = (updatedCoupons: Coupon[]) => {
    setCoupons(updatedCoupons);
    localStorage.setItem('goyo_user_coupons', JSON.stringify(updatedCoupons));
  };

  const saveLettersToLocal = (updatedLetters: SpiritLetter[]) => {
    setLetters(updatedLetters);
    localStorage.setItem('goyo_user_letters', JSON.stringify(updatedLetters));
  };

  const getRegisteredUsers = () => {
    try {
      const saved = localStorage.getItem('goyo_users');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    // Default seed user
    const defaultUser = {
      nickname: 'goyo',
      name: '고요',
      password: 'goyo123!',
      secretAnswer: '자연'
    };
    return [defaultUser];
  };

  // Firestore Synchronizer Utility
  const handleSyncWithFirestore = async (overrideName?: string, overrideAvatar?: string) => {
    const activeName = overrideName || username;
    const activeAvatar = overrideAvatar || userAvatar;
    if (!activeName) {
      showToast('⚠️ 동기화할 수 있는 로그인된 사용자 정보가 없습니다.');
      return;
    }

    setIsSyncing(true);
    try {
      const userPayload = {
        nickname: activeName,
        name: activeName,
        avatar: activeAvatar,
        points: score,
        todayMinutes: todayMinutes,
        revealedSpotIds: secretSpots.filter(s => s.isRevealed).map(s => s.id),
        updatedAt: new Date().toISOString()
      };

      // Write to Firestore db
      await syncUserProfileToFirestore(userPayload);

      // Pull down updated database-backed ranking list
      const remoteUsers = await fetchLiveRankingsFromFirestore();
      
      let finalRankings: RankingUser[] = [];
      if (remoteUsers.length === 0) {
        // First boot of Firebase database: Seed our lovely INITIAL_RANKINGS
        for (const rUser of INITIAL_RANKINGS) {
          await syncUserProfileToFirestore({
            nickname: rUser.name,
            name: rUser.name,
            avatar: rUser.avatar,
            points: rUser.points,
            todayMinutes: rUser.isMe ? todayMinutes : 24,
            revealedSpotIds: [],
            updatedAt: new Date().toISOString()
          });
        }
        // Fetch again after seeding
        const doubleCheckedUsers = await fetchLiveRankingsFromFirestore();
        finalRankings = doubleCheckedUsers.map((u, i) => ({
          rank: i + 1,
          name: u.nickname,
          points: u.points,
          avatar: u.avatar,
          isMe: u.nickname.toLowerCase() === activeName.toLowerCase()
        }));
      } else {
        // Map fetched profiles as visual leaderboard
        finalRankings = remoteUsers.map((u, i) => ({
          rank: i + 1,
          name: u.nickname,
          points: u.points,
          avatar: u.avatar,
          isMe: u.nickname.toLowerCase() === activeName.toLowerCase()
        }));
      }

      setRankings(finalRankings);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Firestore sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Restore state from Firestore when logging in on another device
  const handleRestoreFromFirestore = async (nickname: string) => {
    if (!nickname) return;
    setIsSyncing(true);
    try {
      const profile = await fetchUserProfileFromFirestore(nickname);
      if (profile) {
        setUsername(profile.nickname);
        setUserAvatar(profile.avatar);
        localStorage.setItem('goyo_logged_user', profile.nickname);
        localStorage.setItem('goyo_user_avatar', profile.avatar);

        if (profile.points && profile.points > 0) {
          setScore(profile.points);
          localStorage.setItem('goyo_user_score', profile.points.toString());
        }
        if (profile.todayMinutes) {
          setTodayMinutes(profile.todayMinutes);
        }
        if (profile.revealedSpotIds && profile.revealedSpotIds.length > 0) {
          const updatedSpots = secretSpots.map(s => ({
            ...s,
            isRevealed: profile.revealedSpotIds.includes(s.id)
          }));
          setSecretSpots(updatedSpots);
          localStorage.setItem('goyo_secret_spots', JSON.stringify(updatedSpots));
        }

        // Apply updated rankings
        const remoteUsers = await fetchLiveRankingsFromFirestore();
        if (remoteUsers.length > 0) {
          const list = remoteUsers.map((u, i) => ({
            rank: i + 1,
            name: u.nickname,
            points: u.points,
            avatar: u.avatar,
            isMe: u.nickname.toLowerCase() === nickname.toLowerCase()
          }));
          setRankings(list);
        }

        showToast(`🔮 클라우드(${profile.nickname})에서 미션 이력과 포인트(${profile.points}pt)를 성공적으로 복원했습니다!`);
        sounds.playSuccess();
      } else {
        // No snapshot found? Seed local state as new cloud record
         await syncUserProfileToFirestore({
           nickname: nickname,
           name: nickname,
           avatar: userAvatar,
           points: score,
           todayMinutes: todayMinutes,
           revealedSpotIds: secretSpots.filter(s => s.isRevealed).map(s => s.id),
           updatedAt: new Date().toISOString()
         });
         setLastSyncTime(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Remote restoration failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Space-Sensing Camera (Depth & AR Mapping)
  const handleOpenArCamera = () => {
    triggerClick();
    setIsArCameraOpen(true);
    setIsArScanning(true);
    
    // Seed floaty virtual entities with depth parameters
    const seedArSpirits = [
      { id: 'ar-1', name: '🌌 태기산 오로라 정령', emoji: '🧚✨', x: 25, y: 35, z: 1.1, color: '#10b981' },
      { id: 'ar-2', name: '💧 청태산 원시 이슬구름 요정', emoji: '💧☁️', x: 75, y: 25, z: 0.7, color: '#3b82f6' },
      { id: 'ar-3', name: '🐮 횡성 수련 전설 황소 요정', emoji: '🐂🌟', x: 40, y: 65, z: 2.3, color: '#f59e0b' },
      { id: 'ar-4', name: '🥟 안흥 전통 누룩요정', emoji: '🥟🌸', x: 60, y: 50, z: 1.5, color: '#ec4899' }
    ];
    setArTargetSpirits(seedArSpirits);
    setArDepthTarget(null);

    // Initialise real camera feed inside video ref
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          cameraStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('AR camera failed to start:', err);
        });
    }
  };

  const handleCloseArCamera = () => {
    triggerClick();
    setIsArCameraOpen(false);
    setIsArScanning(false);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
  };

  const handleCaptureArSpirit = async (spirit: any) => {
    sounds.playSuccess();
    const addScore = 50;
    const nextScore = score + addScore;
    setScore(nextScore);
    localStorage.setItem('goyo_user_score', nextScore.toString());

    // Filter captured element
    setArTargetSpirits(prev => prev.filter(s => s.id !== spirit.id));

    showToast(`🌌 [AR 공간 포획] 깊이 ${spirit.z}m 평면에 매핑된 "${spirit.name}" 구조 치료 완료! (+50pt)`);

    // Write real-time sync with database
    try {
      await syncUserProfileToFirestore({
        nickname: username,
        name: username,
        avatar: userAvatar,
        points: nextScore,
        todayMinutes: todayMinutes,
        revealedSpotIds: secretSpots.filter(s => s.isRevealed).map(s => s.id),
        updatedAt: new Date().toISOString()
      });

      const freshList = await fetchLiveRankingsFromFirestore();
      if (freshList.length > 0) {
        setRankings(freshList.map((u, i) => ({
          rank: i + 1,
          name: u.nickname,
          points: u.points,
          avatar: u.avatar,
          isMe: u.nickname.toLowerCase() === username.toLowerCase()
        })));
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Sync failed during capture:', e);
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    triggerClick();
    setSignupError(null);
    
    if (!signupNickname.trim() || !signupName.trim() || !signupPassword.trim() || !signupSecretAnswer.trim()) {
      const msg = '⚠️ 모든 항목(닉네임, 이름, 비밀번호, 좋아하는 것 답변)을 입력해 주세요.';
      setSignupError(msg);
      showToast(msg);
      return;
    }
    
    // Check password specification (at least one special character is required)
    const specialCharRegex = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"\\]/;
    if (!specialCharRegex.test(signupPassword)) {
      const msg = '⚠️ 비밀번호에는 하나 이상의 특수문자(!@#$%^&* 등)가 꼭 포함되어야 합니다!';
      setSignupError(msg);
      showToast(msg);
      return;
    }
    
    const users = getRegisteredUsers();
    const userExists = users.some(
      (u: any) => u.nickname.toLowerCase() === signupNickname.trim().toLowerCase()
    );
    
    if (userExists) {
      const msg = '⚠️ 이미 존재하는 닉네임입니다. 다른 닉네임을 사용해 주세요.';
      setSignupError(msg);
      showToast(msg);
      return;
    }
    
    const newUser = {
      nickname: signupNickname.trim(),
      name: signupName.trim(),
      password: signupPassword.trim(),
      secretAnswer: signupSecretAnswer.trim()
    };
    
    const updatedUsers = [...users, newUser];
    localStorage.setItem('goyo_users', JSON.stringify(updatedUsers));
    
    showToast(`🎉 회원가입 성공! 이제 '${newUser.nickname}' 이름으로 로그인할 수 있습니다.`);
    sounds.playSuccess();
    
    // Auto populate and switch to login
    setUserIdInput(newUser.nickname);
    setUserPasswordInput(newUser.password);
    setAuthMode('login');
    
    // Clear inputs
    setSignupNickname('');
    setSignupName('');
    setSignupPassword('');
    setSignupSecretAnswer('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    triggerClick();
    setLoginError(null);
    if (userIdInput.trim() === '' || userPasswordInput.trim() === '') {
      const msg = '⚠️ 아이디와 비밀번호를 모두 입력해 주세요.';
      setLoginError(msg);
      showToast(msg);
      return;
    }
    
    const users = getRegisteredUsers();
    const matchedUser = users.find(
      (u: any) => u.nickname.toLowerCase() === userIdInput.trim().toLowerCase()
    );
    
    if (!matchedUser) {
      const msg = '⚠️ 가입되지 않은 닉네임입니다. 회원가입을 먼저 진행해 주세요.';
      setLoginError(msg);
      showToast(msg);
      return;
    }
    
    if (matchedUser.password !== userPasswordInput.trim()) {
      const msg = '⚠️ 비밀번호가 일치하지 않습니다. 다시 입력해 주세요.';
      setLoginError(msg);
      showToast(msg);
      return;
    }
    
    const resolvedName = matchedUser.nickname;
    setIsLoggedIn(true);
    setUsername(resolvedName);
    localStorage.setItem('goyo_logged_user', resolvedName);
    
    // Attempt remote restore from Firestore (allows loading records, profiles, and score across devices)
    handleRestoreFromFirestore(resolvedName);

    showToast(`🔑 환영합니다, ${matchedUser.name} 님! 고요로 웰니스 여정을 시작할게요.`);
    sounds.playSuccess();
  };

  const handleFindPassword = (e: React.FormEvent) => {
    e.preventDefault();
    triggerClick();
    setFindPasswordError(null);
    
    if (!findPasswordNickname.trim() || !findPasswordName.trim() || !findPasswordSecretAnswer.trim()) {
      const msg = '⚠️ 닉네임, 실명, 좋아하는 것 답변을 모두 채워 주세요.';
      setFindPasswordError(msg);
      showToast(msg);
      return;
    }
    
    const users = getRegisteredUsers();
    const matchedUser = users.find(
      (u: any) => u.nickname.toLowerCase() === findPasswordNickname.trim().toLowerCase() &&
                  u.name.trim() === findPasswordName.trim() &&
                  (u.secretAnswer || '자연').trim().toLowerCase() === findPasswordSecretAnswer.trim().toLowerCase()
    );
    
    if (!matchedUser) {
      const msg = '⚠️ 일치하는 나그네 정보를 찾을 수 없습니다. 닉네임, 이름, 문답을 정확히 기재하셨는지 확인해 주세요.';
      setFindPasswordError(msg);
      showToast(msg);
      setFoundPasswordResult(null);
      return;
    }
    
    setFoundPasswordResult(matchedUser.password);
    sounds.playSuccess();
    showToast('🔑 비밀번호 조회가 성공하였습니다!');
  };

  const handleLogout = () => {
    triggerClick();
    setIsLoggedIn(false);
    setUsername('');
    localStorage.removeItem('goyo_logged_user');
    // Stop any playing audio
    stopAllAmbientSounds();
    showToast('🔐 로그아웃되었습니다. 다시 평온해지면 돌아오세요.');
  };

  // Reset errors when shifting between authentications
  useEffect(() => {
    setLoginError(null);
    setSignupError(null);
    setFindPasswordError(null);
    setFindPasswordSecretAnswer('');
  }, [authMode]);

  // 횡성 진짜 인터랙티브 지도를 실시간으로 기획 및 배치하는 렌더링 훅
  useEffect(() => {
    // map 탭이고, mapContainer DOM이 성공적으로 연결되고 지도가 아직 초기화되지 않았을 때만 구동
    if (activeTab === 'map' && mapContainerRef.current && !mapInstanceRef.current) {
      try {
        const centerCoords: [number, number] = [37.4912, 128.1402];
        const map = L.map(mapContainerRef.current, {
          center: centerCoords,
          zoom: 11,
          zoomControl: false, // CASING 케이스 내부이므로 줌 슬라이더를 부득이하게 오른쪽 밑으로 내립니다
          attributionControl: false
        });

        // 줌 제어기를 오른쪽 하단에 소담하게 추가합니다
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Voyager 타일: 산뜻하고 여유로운 뉴트럴 라이트 톤 타일 레이어
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 18,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Force Leaflet container recalculation after DOM initialization finishes
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);

        // 횡성 핵심 웰니스의 구체적 실 지리학 좌표 매핑
        const wellnessCoords: Record<string, { lat: number, lng: number, emoji: string, color: string }> = {
          'c1': { lat: 37.4115, lng: 128.1565, emoji: '🥟', color: '#8a6552' }, // 안흥찐빵 삼거리
          'c2': { lat: 37.4932, lng: 128.2831, emoji: '🌲', color: '#2a5539' }, // 국립횡성숲체원
          'c3': { lat: 37.4912, lng: 127.9865, emoji: '🐮', color: '#a67c52' }, // 섬강 한우터
          'c4': { lat: 37.5255, lng: 128.3182, emoji: '🧘', color: '#c27a3a' }  // 태기산전망대
        };

        // Unified premium serpentine forest trail connecting all points sequentially along realistic winding valleys
        const connectedTrail: [number, number][] = [
          // c3: 섬강 한우터 (West)
          [37.4912, 127.9865], 
          [37.4925, 127.9992],
          [37.4875, 128.0135],
          [37.4811, 128.0090],
          [37.4746, 128.0160],
          [37.4725, 128.0298],
          [37.4682, 128.0390],
          [37.4610, 128.0435],
          [37.4565, 128.0560],
          [37.4590, 128.0695],
          [37.4520, 128.0810],
          [37.4435, 128.0920],
          [37.4385, 128.1065],
          [37.4340, 128.1215],
          [37.4278, 128.1340],
          [37.4202, 128.1405],
          [37.4144, 128.1490],
          // c1: 안흥찐빵 삼거리 (South)
          [37.4115, 128.1565], 
          [37.4132, 128.1630],
          [37.4190, 128.1725],
          [37.4255, 128.1812],
          [37.4308, 128.1888],
          [37.4350, 128.1965],
          [37.4412, 128.2040],
          [37.4468, 128.2115],
          [37.4520, 128.2200],
          [37.4568, 128.2295],
          [37.4612, 128.2380],
          [37.4660, 128.2455],
          [37.4715, 128.2520],
          [37.4760, 128.2585],
          [37.4812, 128.2630],
          [37.4868, 128.2725],
          [37.4902, 128.2775],
          // c2: 국립횡성숲체원 (East-Middle)
          [37.4932, 128.2831], 
          [37.4952, 128.2882],
          [37.4988, 128.2935],
          [37.5025, 128.2905],
          [37.5048, 128.2858],
          [37.5070, 128.2928],
          [37.5112, 128.2980],
          [37.5142, 128.3052],
          [37.5178, 128.3010],
          [37.5212, 128.3125],
          [37.5238, 128.3168],
          // c4: 태기산전망대 (Far East)
          [37.5255, 128.3182]
        ];

        L.polyline(connectedTrail, {
          color: '#2a5539', // Forest green thread
          weight: 5.5,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map).bindTooltip("🚶 고요로 숲길 연결 코스 (추천 도보 동선)", { 
          permanent: true, 
          direction: "top", 
          className: "goyo-map-tooltip" 
        });

        // Fit map bounds containing all paths beautifully
        const bounds = L.latLngBounds([
          [37.40, 127.95],
          [37.55, 128.35]
        ]);
        map.fitBounds(bounds, { padding: [12, 12] });

        // 대중교통 출발지 핀 추가 (횡성시외버스터미널, KTX 횡성역)
        const transitPoints = [
          {
            name: '🚌 횡성시외버스터미널 (대중교통 출발지)',
            lat: 37.4891,
            lng: 127.9750,
            emoji: '🚌',
            detail: '시외버스터미널에서 시작하는 웰니스 도보 동선'
          },
          {
            name: '🚊 KTX 횡성역 (대중교통 출발지)',
            lat: 37.4984,
            lng: 128.0101,
            emoji: '🚊',
            detail: 'KTX 기차로 횡성에 도착해서 시작하는 도보 동선'
          }
        ];

        transitPoints.forEach(pt => {
          const transitIcon = L.divIcon({
            html: `
              <div class="relative flex flex-col items-center">
                <div class="w-8 h-8 rounded-full bg-blue-50 border-2 border-emerald-800 shadow-md flex items-center justify-center">
                  <span class="text-base">${pt.emoji}</span>
                </div>
                <div class="mt-1 bg-[#1d3d29] text-white px-2 py-0.5 rounded-full shadow-lg text-[8px] font-bold whitespace-nowrap">
                  ${pt.name}
                </div>
              </div>
            `,
            className: 'custom-transit-pin',
            iconSize: [41, 52],
            iconAnchor: [20, 44]
          });

          const marker = L.marker([pt.lat, pt.lng], { icon: transitIcon }).addTo(map);
          marker.bindPopup(`<div class="p-2 text-stone-850 font-sans"><h4 class="font-extrabold text-xs text-[#2a5539]">${pt.emoji} ${pt.name}</h4><p class="text-[9px] text-stone-600 mt-1">${pt.detail}</p></div>`);
          mapMarkersRef.current.push(marker);
        });

        // 대중교통 연계 점선 (Dashed connector lines)
        const terminalConnector: [number, number][] = [[37.4891, 127.9750], [37.4912, 127.9865]];
        const stationConnector: [number, number][] = [[37.4984, 128.0101], [37.4925, 127.9992]];

        L.polyline(terminalConnector, {
          color: '#1d3d29',
          weight: 3,
          opacity: 0.75,
          dashArray: '5, 5',
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);

        L.polyline(stationConnector, {
          color: '#1d3d29',
          weight: 3,
          opacity: 0.75,
          dashArray: '5, 5',
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);

        // 코스를 돌며 핀을 단독으로 생성하고 탭 온 이벤트와 물려 하단 슬라이드 시터를 띄웁니다!
        courses.forEach((course) => {
          const cfg = wellnessCoords[course.id];
          if (cfg) {
            const customIcon = L.divIcon({
              html: `
                <div class="relative flex flex-col items-center">
                  <div class="w-8.5 h-8.5 rounded-full bg-white border-2 border-[#4a7c59] shadow-md flex items-center justify-center animate-bounce duration-1000">
                    <span class="text-base">${course.locked ? '🔒' : cfg.emoji}</span>
                  </div>
                  <div class="mt-1 bg-white/95 border border-stone-200/80 px-2 py-0.5 rounded-full shadow-lg text-[9px] font-extrabold text-stone-700 whitespace-nowrap">
                    ${course.name.substring(2)}
                  </div>
                </div>
              `,
              className: 'custom-wellness-pin',
              iconSize: [40, 52],
              iconAnchor: [20, 44]
            });

            const marker = L.marker([cfg.lat, cfg.lng], { icon: customIcon }).addTo(map);
            
            // 마커 클릭 시 해당 코스 아래에서 슬라이드 서랍이 쓱 올라오게 연동
            marker.on('click', () => {
              handleSelectCourseOnMap(course);
            });

            mapMarkersRef.current.push(marker);
          }
        });
      } catch (err) {
        console.warn('Leaflet map initialization failure: ', err);
      }
    }

    // 맵 탭에서 나가면 지도 리소스를 즉시 안전하게 수거합니다 (메모리 누수 원천 차단)
    return () => {
      if (activeTab !== 'map' && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          mapMarkersRef.current = [];
        } catch (e) {
          console.warn('Leaflet cleanup oversight: ', e);
        }
      }
    };
  }, [activeTab]);

  // Timer ticker logic
  useEffect(() => {
    if (timerActive && !isTimerPaused) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerActive, isTimerPaused]);

  // Handle successful timer countdown completion
  const handleTimerComplete = () => {
    setTimerActive(false);
    setIsTimerPaused(false);
    
    // Add points
    const pointsOnFinish = 150;
    const newScore = score + pointsOnFinish;
    setScore(newScore);
    localStorage.setItem('goyo_user_score', newScore.toString());

    // Update today's detox duration
    const addedMins = Math.round(timerTotal / 60);
    setTodayMinutes(prev => prev + addedMins);

    // Increment walked km
    const addedKm = parseFloat((addedMins * 0.12 || 1.8).toFixed(1));
    const nextKm = parseFloat((walkedKm + addedKm).toFixed(1));
    setWalkedKm(nextKm);
    localStorage.setItem('goyo_walked_km', nextKm.toString());

    // Register active course as visited
    if (activeCourseId) {
      setVisitedCourseIds(prev => {
        if (!prev.includes(activeCourseId)) {
          return [...prev, activeCourseId];
        }
        return prev;
      });
      setActiveCourseId(null);
    }

    // Also random chance to unlock one of the locked paths
    const lockedCourses = courses.filter(c => c.locked);
    let updatedCourses = [...courses];
    let unlockMsg = '';
    if (lockedCourses.length > 0) {
      const targetToUnlock = lockedCourses[0];
      updatedCourses = courses.map(c => c.id === targetToUnlock.id ? { ...c, locked: false } : c);
      setCourses(updatedCourses);
      localStorage.setItem('goyo_courses', JSON.stringify(updatedCourses));
      unlockMsg = ` 🔓 [${targetToUnlock.name}]가 개방되었습니다!`;
    }

    // Energize unlocked spirits
    const updatedSpirits = spirits.map(s => {
      if (s.isUnlocked) {
        return { ...s, energy: Math.min(s.maxEnergy, s.energy + 35) };
      }
      return s;
    });
    setSpirits(updatedSpirits);
    const updatedSelected = updatedSpirits.find(s => s.id === selectedSpirit.id);
    if (updatedSelected) setSelectedSpirit(updatedSelected);

    // Award 2 premium feeds as high quality mission completion reward
    const rewardFeedsCount = 2;
    saveFeedsToLocal(feedCount + rewardFeedsCount);

    sounds.playSuccess();
    showToast(`🎉 명상 완수 성공! 고요력 +${pointsOnFinish}pt & 🌾 고급사료 +${rewardFeedsCount}개 획득!${unlockMsg}`);
  };

  // Start timer procedure
  const handleStartTimer = (mins: number = 25) => {
    triggerClick();
    const secs = mins * 60;
    setTimerSeconds(secs);
    setTimerTotal(secs);
    setIsTimerPaused(false);
    setTimerActive(true);
    showToast(`⏱️ ${mins}분 온전한 디지털 차단 디톡스가 구동됩니다.`);
  };

  // Pause button procedure
  const handlePauseToggle = () => {
    triggerClick();
    setIsTimerPaused(!isTimerPaused);
    showToast(isTimerPaused ? '⏱️ 마음의 소리에 집중하기를 재개합니다.' : '⏸️ 명상 수양이 일시 보류되었습니다.');
  };

  // premature stop request
  const handleStopRequest = () => {
    triggerClick();
    setShowWarningModal(true);
  };

  // Quit timer confirmed
  const confirmCancelTimer = () => {
    triggerClick();
    setShowWarningModal(false);
    setTimerActive(false);
    setIsTimerPaused(false);
    showToast('⚠️ 도중에 중단하셨습니다. 정령들의 에너지가 감소합니다.');
  };

  // Unlock locked map courses with score points
  const handleUnlockCourse = (courseId: string) => {
    triggerClick();
    const targetCourse = courses.find(c => c.id === courseId);
    if (!targetCourse) return;

    if (score < 100) {
      setShowQuestPromptModal(true);
      return;
    }

    const nextScore = score - 100;
    setScore(nextScore);
    localStorage.setItem('goyo_user_score', nextScore.toString());

    const updated = courses.map(c => c.id === courseId ? { ...c, locked: false } : c);
    setCourses(updated);
    localStorage.setItem('goyo_courses', JSON.stringify(updated));

    // Update the bottom drawer views too
    const matched = updated.find(c => c.id === courseId);
    if (matched) setSelectedCourse(matched);

    sounds.playSuccess();
    showToast(`🔓 [${targetCourse.name}] 명유의 경로가 활성화되었습니다. (-100pt)`);
  };

  // Garden Activities - Feeding, Petting, Shop Purchase, and Reward Coupon Claiming
  const handleBuyFeed = () => {
    triggerClick();
    if (score < 100) {
      setShowQuestPromptModal(true);
      return;
    }
    const nextScore = score - 100;
    setScore(nextScore);
    localStorage.setItem('goyo_user_score', nextScore.toString());
    
    const nextFeeds = feedCount + 5;
    saveFeedsToLocal(nextFeeds);
    sounds.playSuccess();
    showToast('🌾 성공! 고요력 100pt로 프리미엄 영양 사료 5개를 교환해 정원에 보관했습니다!');
  };

  const handleFeedSpirit = (spiritId: string) => {
    triggerClick();
    if (feedCount <= 0) {
      showToast('⚠️ 보유하신 사료가 똑 떨어졌습니다! 수행 명상(타이머)을 완수하거나 아래 포인트 교환숍에서 사료를 구매하세요!');
      return;
    }

    const updated = spirits.map(s => {
      if (s.id === spiritId) {
        if (s.energy >= s.maxEnergy) {
          showToast(`🍏 ${s.name}은(는) 이미 원기 가득해 통통합니다!`);
          return s;
        }
        const nextEnergy = Math.min(s.maxEnergy, s.energy + 20);
        showToast(`🍏 ${s.name}에게 횡성 참비나무 고급 사료를 주었습니다! 기력/호감도 +20 ⚡ (남은 사료: ${feedCount - 1}개)`);
        sounds.playSuccess();
        return { ...s, energy: nextEnergy, fedCount: s.fedCount + 1 };
      }
      return s;
    });

    saveFeedsToLocal(feedCount - 1);
    setSpirits(updated);
    const updatedSelected = updated.find(s => s.id === spiritId);
    if (updatedSelected) setSelectedSpirit(updatedSelected);
  };

  const handlePetSpirit = (spiritId: string) => {
    triggerClick();
    if (spiritId === 'banggu') {
      sounds.playCowMoo();
    } else {
      sounds.playSuccess();
    }

    const updated = spirits.map(s => {
      if (s.id === spiritId) {
        const text = spiritId === 'banggu' 
          ? `🐮 '방구'를 쓰다듬었습니다 (우물우물 "음매애~" 하며 따뜻하게 꼬리를 흔듭니다!) 🧡 (기력 +8)`
          : `💖 ${s.name}을(는) 다듬어주었습니다. 마음의 애착 에너지가 차오릅니다. (기력 +8 ⚡)`;
        showToast(text);
        return { ...s, petCount: s.petCount + 1, energy: Math.min(s.maxEnergy, s.energy + 8) };
      }
      return s;
    });
    setSpirits(updated);
    const updatedSelected = updated.find(s => s.id === spiritId);
    if (updatedSelected) setSelectedSpirit(updatedSelected);
  };

  const handleAddCourseReview = (courseId: string) => {
    if (!newCommentText.trim()) {
      showToast('⚠️ 후기 내용을 입력하세요!');
      return;
    }
    const newRev = {
      id: Date.now().toString(),
      courseId,
      user: username || '고요나그네',
      rating: tempRating,
      text: newCommentText.trim(),
      time: '방금 전'
    };
    setCourseReviews([newRev, ...courseReviews]);
    setNewCommentText('');
    sounds.playSuccess();
    showToast('💬 후기가 성공적으로 등록되었습니다. 커뮤니티 채팅에 반영되었습니다!');
  };

  const handleRefreshQuests = () => {
    if (hasRefreshedQuest) {
      showToast('⚠️ 미션 새로고침은 하루에 한 번만 소중하게 이용 가능합니다!');
      return;
    }
    sounds.playSuccess();
    setDailyQuests([
      { name: '💧 아침이슬 속에서 조용한 아침 행정', sub: '섬강 수변 자갈길 명상숲', desc: '섬강 아침 이슬길을 1.5km 이상 도보하여 건강한 기상 세로토닌 촉진하기', reward: '참비나무 사료 +2개 획득', points: 60, icon: '💧' },
      { name: '🐮 횡성한우 기운 돌담길 수색하기', sub: '비밀 QR 헌터 구역 돌파', desc: '한우 전통 마을 돌담길 근방의 솔버섯 스터디룸 옆에 위치한 QR 코드를 촬영하세요', reward: '먹이 주머니 가득 충전', points: 120, icon: '🐮' },
      { name: '🧎 자연 숲속에서 고독하게 바람 소리 듣기', sub: '15분 무념무상 자연동화', desc: '잣나무 쉼터 의자에 누워 바람소리와 새소리에 완전히 몰입하며 15분 명상하기', reward: '스탈렛 호감도 즉각 상승', points: 90, icon: '🧘' }
    ]);
    setHasRefreshedQuest(true);
    showToast('🔄 미션 리스트가 새로운 치유 도전장으로 변경되었습니다!');
  };

  const startRecordingSound = async () => {
    sounds.playClick();
    setIsRecordingSound(true);
    setRecordingSeconds(0);
    showToast('🎙️ 자연의 소리를 녹음 전용 수집기로 청청하게 녹음합니다. 소리를 보태보세요.');
    
    let currentSec = 0;
    const interval = setInterval(() => {
      currentSec += 1;
      setRecordingSeconds(currentSec);
    }, 1000);
    setRecordingIntervalId(interval);
  };

  const stopRecordingSound = () => {
    sounds.playSuccess();
    if (recordingIntervalId) {
      clearInterval(recordingIntervalId);
      setRecordingIntervalId(null);
    }
    setIsRecordingSound(false);
    
    const durationStr = `${recordingSeconds === 0 ? 3 : recordingSeconds}초`;
    const newSound = {
      id: `rec-${Date.now()}`,
      title: `🍃 내가 녹음한 고요 자연소리 (#${recordedSounds.length})`,
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      duration: durationStr
    };
    setRecordedSounds([newSound, ...recordedSounds]);
    showToast(`💾 녹음 완료! '${newSound.title}' (${durationStr})이 수집첩에 성공적으로 보관되었습니다.`);
  };

  const playSynthesizedNatureSound = (title: string) => {
    try {
      // Stop anything currently playing
      if (activeAudioCtxRef.current) {
        activeAudioCtxRef.current.close().catch(() => {});
        activeAudioCtxRef.current = null;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      activeAudioCtxRef.current = ctx;

      const cleanTitle = title || "";

      if (cleanTitle.includes('바람') || cleanTitle.includes('숲속') || cleanTitle.includes('들숨') || cleanTitle.includes('녹음')) {
        // Beautiful organic wind whoosh sound (sweeping oscillators)
        const duration = 4.0;
        const now = ctx.currentTime;
        
        const oscLow = ctx.createOscillator();
        const oscHigh = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        oscLow.type = 'triangle';
        oscLow.frequency.setValueAtTime(80, now);
        oscLow.frequency.exponentialRampToValueAtTime(140, now + 1.8);
        oscLow.frequency.exponentialRampToValueAtTime(60, now + duration);

        oscHigh.type = 'sine';
        oscHigh.frequency.setValueAtTime(450, now);
        // Modulated frequency simulating whistling wind
        for (let t = 0; t <= duration; t += 0.5) {
          oscHigh.frequency.setValueAtTime(400 + Math.sin(t * 3) * 120, now + t);
        }

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 1.5);
        filter.frequency.exponentialRampToValueAtTime(150, now + duration);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.6);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration - 0.2);

        oscLow.connect(filter);
        oscHigh.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscLow.start(now);
        oscHigh.start(now);
        oscLow.stop(now + duration);
        oscHigh.stop(now + duration);
      } else if (cleanTitle.includes('물까치') || cleanTitle.includes('새소리') || cleanTitle.includes('🐦') || cleanTitle.includes('아침')) {
        // Synthesizing a cute bird chirp motif
        const now = ctx.currentTime;
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);

        // 3 elegant sweet chirps
        for (let i = 0; i < 3; i++) {
          const chirpStart = now + (i * 0.9);
          const oscNode = ctx.createOscillator();
          oscNode.type = 'sine';
          oscNode.connect(gainNode);

          oscNode.frequency.setValueAtTime(750, chirpStart);
          oscNode.frequency.exponentialRampToValueAtTime(2200, chirpStart + 0.14);
          oscNode.frequency.exponentialRampToValueAtTime(1100, chirpStart + 0.28);

          gainNode.gain.setValueAtTime(0.001, chirpStart);
          gainNode.gain.linearRampToValueAtTime(0.12, chirpStart + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, chirpStart + 0.32);

          oscNode.start(chirpStart);
          oscNode.stop(chirpStart + 0.35);
        }
      } else {
        // Lovely pentatonic meditation notes
        const duration = 4.0;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(261.63, now); // Do
        osc.frequency.setValueAtTime(293.66, now + 0.8); // Re
        osc.frequency.setValueAtTime(329.63, now + 1.6); // Mi
        osc.frequency.setValueAtTime(392.00, now + 2.4); // Sol
        osc.frequency.setValueAtTime(440.00, now + 3.2); // La

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration - 0.2);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      }
    } catch (e) {
      console.warn("AudioContext load error / security restriction:", e);
    }
  };

  const stopSynthesizedNatureSound = () => {
    try {
      if (activeAudioCtxRef.current) {
        activeAudioCtxRef.current.close().catch(() => {});
        activeAudioCtxRef.current = null;
      }
    } catch (e) {}
  };

  const togglePlayRecordedSound = (id: string) => {
    if (playingRecordedId === id) {
      setPlayingRecordedId(null);
      stopSynthesizedNatureSound();
      showToast('🔇 재생을 멈춤했습니다.');
    } else {
      stopSynthesizedNatureSound();
      const soundObj = recordedSounds.find(s => s.id === id);
      const title = soundObj ? soundObj.title : "";
      
      setPlayingRecordedId(id);
      playSynthesizedNatureSound(title);
      showToast(`🔊 '${title}' 복용 재생 중... (볼륨 업!)`);
      // Auto stop after 4 seconds
      setTimeout(() => {
        setPlayingRecordedId((prev) => {
          if (prev === id) {
            stopSynthesizedNatureSound();
            return null;
          }
          return prev;
        });
      }, 4000);
    }
  };

  const generateSpiritLetter = (spirit: Spirit, couponTitle: string, user: string): SpiritLetter => {
    const currentDays = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const fed = spirit.fedCount;
    
    let letterTitle = '';
    let content = '';

    const cleanUser = user || '나그네';

    if (spirit.id === 'dodo') {
      letterTitle = `💧 도도와의 촉촉한 교감 엽서 (사료 횟수: ${fed}회)`;
      if (fed < 6) {
        content = `물톡! ${cleanUser}아 안녕? 잣나무 사료를 찹찹 먹었더니 기분이 촉촉한 도도야! 횡성 숲에서 스마트폰 끄고 맑은 자연을 호흡해 줘서 고마워! 
꿀팁 하나 투척할게: 국립횡성숲체원 무장애 지상 데크로드 초입 벤치에 10분만 앉아 있어봐. 잡생각이 싹 씻겨 나간단다. 톡!`;
      } else if (fed < 12) {
        content = `톡! 촉촉 도도 등장! 그새 우리 마음이 안개 이슬처럼 진하게 엮였어! 사료가 너무 구수해서 내 원형 물방울 몸짱 각도가 터질 것 같아! 
횡성 맛집 꿀정보 대공개: 횡성종합운동장 앞에 있는 '운동장해장국' 최고봉이야! 한우 해장국에다 사장님이 주는 다진 매콤 청양고추 한 술 듬뿍 풀어봐. 국물이 진득해지며 다리 피로가 싹 가신단다. 영원히 톡톡하자!`;
      } else {
        content = `내 영원의 영양사 ${cleanUser} 님! 톡! 고급 사료 자루를 통째로 부어주시니 물방울 도도가 섬강 수달뺨치는 최강 우주 정령이 되었어! 
약속대로 가문의 극비 꿀장소를 전수할게: 숲체원 온열체험관 뒤쪽 잣나무 숲마루 벤치가 있어. 오후 4시 반쯤 스마트폰을 비행기모드로 해놓고 누우면 새 우는 소리가 완전 입체 돌비 사운드로 마음에 스며들어. 끝내고 삼거리에 '심순녀 안흥찐빵' 한 포대 사서 오물쪼개 먹으며 귀가하면 그게 바로 웰니스 끝판왕이지! 톡!`;
      }
    } else if (spirit.id === 'banggu') {
      letterTitle = `🐮 방구가 우직한 꼬리로 꾹 누른 한지 (사료 횟수: ${fed}회)`;
      if (fed < 6) {
        content = `음메애~! 나 횡성 황소 방구, 사료 부스러기 한 톨 안 남기고 우물우물 참맛있게 먹었소! 자네가 명상하면서 실눈 다 뜬 거 내 퉁방울 왕눈으로 보았지만 봐주겠네! 
소박한 꿀정보: 횡성 장날(1, 6일)날 읍내 오일장가면 숯불향 수수부꾸미 꿀맛이니 꼭 들러보게나. 음메!`;
      } else if (fed < 12) {
        content = `음메... 나 거대 황소 방구, ${cleanUser} 자네가 사료를 하도 지극정성으로 퍼부어 주어서 내 일등 위장이 남김없이 호용량을 초과했소! 고마워서 진짜 로컬 로컬 맛집 알려드림세. 
관광지용 말고 진짜 찐 맛집은 '함밭식당'의 백년 전통 한우 불고기오. 혓바닥에 고기 한 점 닿자마자 안흥 찐빵 팥소처럼 녹아버린다오. 씹을 때 폰 보지 말고 혀끝에 온 신경을 부려 명상해보게나. 음메애~!`;
      } else {
        content = `음머어어어어~! 귀인 ${cleanUser} 자네는 방구의 평생 동반자요! 사료를 맨날 꿀맛으로 채워주시니 이마 털에 들꽃 향이 돌고 엉덩이가 태평맥이 우람해졌소! 
우리 방구 문중 극비 꿀장소: 지친 날에 '횡성호수길 5코스 망향길'을 새벽 6시 20분에 스마트폰을 원치 차단하고 걸어보게나. 호수 위로 솜털 구름 같은 물안개가 스윽 깔리는데, 나무 벤치에 고요히 앉아 흐르는 안개소리를 들으면 자네 복잡한 고뇌가 전부 호수로 가라앉는다네. 돌아오는 길에 안흥 김치찐빵 한 입 베어 물면 이것이 최고 웰니스 극락이지! 음메애~!`;
      }
    } else if (spirit.id === 'meok_gureum') {
      letterTitle = `☁️🐈 먹구름 퐁실 안개 냥엽서 (사료 횟수: ${fed}회)`;
      if (fed < 6) {
        content = `안개 먹이랑 솜구름 아기 요정 왔당구! 밥 줘서 진짜 신난다 냥! ${cleanUser}이 스마트폰 빛 꺼둘 때마다 우리 솜털이 하나씩 더 복실복실해져! 
가까운 꿀장소: 태기산 풍차 아래 비밀 꽃사리 길 꼭 찾아봐, 바람 냄새가 솜사탕처럼 달달구리 최고야 냥!`;
      } else if (fed < 12) {
        content = `퐁실퐁실 푸슝~! ${cleanUser}이가 준 참사료 먹고 우리 대폭발 왕구름 되었당구! 
횡성 길먹 꿀팁: 안흥찐빵 마을 삼거리에 가보면 일반 찐빵 말고 '겉바속촉 튀김찐빵' 골목 구석에서 파는데가 있어! 한 입 파삭하면 팥소가 달달구리 온천수처럼 터져 나오는데 걷다가 먹으면 등산 2000보 순식간에 돌파 수치야!! 폰에 침 묻지 않게 조심해라 냥!`;
      } else {
        content = `으아아아앙! ${cleanUser}이가 사료자루 통장째 헌사해줘서 우리 안개 먹이랑 솜구름 뚱뚱 군단 가이아급으로 소환돼서 난리났당구! 고마워서 우주에서 제일 예쁜 최고 꿀밤하늘 알려준당구! 
해발 980미터 '태기산 풍력발전기 7호기 기둥 뒤 덤불 구름'이 있어. 밤 11시 이후에 스마트폰 완전히 음소거 처박고 풀밭 벤치 뒤에 누워보렴. 바람개비 지나갈 때 은하수가 하늘에서 폭죽처럼 눈동자에 우수수 낙하해! 폰 액정 빛 절대 보지 말고 눈동자에 별을 가득 세겨 봐냥!`;
      }
    } else if (spirit.id === 'daldalyi') {
      letterTitle = `🦦 달달이의 은물결 조개 편지 (사료 횟수: ${fed}회)`;
      if (fed < 6) {
        content = `찹찹! 안냥! 난 횡성의 자부심, 섬강 달콤이 아기 수달 달달이야! ${cleanUser}이 숲에서 폰 접고 조요히 걸어가며 사색할 때 섬강 속에서 조개껍데기 비추고 응원했수달! 
참사료 찹찹 먹었으니 조개 선물 찹!`;
      } else if (fed < 12) {
        content = `찹찹찹! ${cleanUser}의 명품 배식 참사료 기분 짱 수달🦦! 보물 주머니에 숨겨진 횡성 식도락 꿀맛 힌트 줄게: 
청일면 '삼군리 메밀마을'에 가면 백설 같은 막국수를 판다수달. 양념 치지 말고 가마솥 무짠지 동치미 국물부터 세 번만 꿀꺽 삼켜봐. 가슴 끝까지 횡성의 맑은 산림 향기가 들어서서 이보다 더 평안할 수 없다 찹찹수달!`;
      } else {
        content = `내 심장의 친구 ${cleanUser} 님! 찹찹찹! 정원 사료 풍성하게 채워주셔서 나 상강 은자갈밭에서 백텀블링 돌며 노느라 털이 번쩍번쩍 광이 난수달! 
비밀 단호 꿀장소 알려줄게: '섬강 둔치 고요 갈대 산책로'가 인적이 드물어 명상의 은밀지야. 오후 5시 45분쯤 노을 황금 가루가 흐릿하게 번질 때, 스마트폰 알람은 완전히 폐쇄해 두고 강물 소리 고주파에 귀를 딱 기울여 봐. 찐 가마솥 찐빵보다 달고 편안한 숲의 윤슬 주파수가 머리 끝 전율 번뜩 씻어준다구🦦 찹!`;
      }
    } else {
      letterTitle = `🌲 비밀의 정령의 은혜 가을 잎새 (사료 횟수: ${fed}회)`;
      if (fed < 6) {
        content = `스르륵~ 보행 수련으로 마음 꽃 가꾸어 준 ${cleanUser} 님께 감사를 드립니다. 스마트폰을 끄고 한 걸음 한 걸음 오직 횡성 소나무 솔잎을 밟는 발바닥 감각에 깨어 있어 보세요.`;
      } else if (fed < 12) {
        content = `숲의 정령이 들려주는 식미 명상 꿀팁: 횡성 전통 오일장 장날(1, 6일) 시골 장터에 가보면 산더덕 석쇠구이 정식을 소박하게 판답니다. 참숯향 가득한 은은한 향기를 혀 위에 굴려가며 천천히 드셔보세요.`;
      } else {
        content = `고요로 통하는 횡성 극비 꿀지점: 안흥면 우천리 한적한 자작나무 데크길이 있습니다. 주말에도 오직 새소리와 나뭇바람 소리뿐이니, 스마트폰을 완전 차단하시고 한 발 들고 내쉴 때 발에 실리는 기적같은 온열 체온을 가득 만끽해 보세요. 평안을 빕니다.`;
      }
    }

    return {
      id: `letter_${Date.now()}`,
      writer: `${spirit.name} (${spirit.id === 'banggu' ? '아기 황소' : spirit.id === 'dodo' ? '물방울 요정' : spirit.id === 'meok_gureum' ? '안개구름 세트' : spirit.id === 'daldalyi' ? '섬강 수달' : '비물 정령'})`,
      avatar: spirit.emoji,
      title: letterTitle,
      content: content,
      date: currentDays,
      associatedCoupon: couponTitle
    };
  };

  // Give a thank-you coupon from the spirit once HP / affection reaches 100% (max HP)!
  // No release (방생) so the spirit is kept safely in the user's garden forever!
  const handleClaimSpiritReward = (spirit: Spirit) => {
    triggerClick();
    if (spirit.energy < 100) {
      showToast('⚠️ 이 정령의 기력(호감도)이 100점에 성취되어야 고마움의 사랑의 쿠폰을 돌려받을 수 있습니다!');
      return;
    }

    // Trigger magical reward award animation overlay
    setReleasingSpirit(spirit);
    setIsReleaseAnimating(true);
    
    // Extract random local coupon
    const randomIndex = Math.floor(Math.random() * ALL_COUPONS_POOL.length);
    const rolledTemplate = ALL_COUPONS_POOL[randomIndex];
    const generatedUniqueCode = `GY-GIFT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCoupon: Coupon = {
      id: `coupon_${Date.now()}`,
      title: `💝 ${spirit.name}의 보은: ${rolledTemplate.title}`,
      provider: rolledTemplate.provider,
      discount: rolledTemplate.discount,
      expireDate: rolledTemplate.expireDate,
      used: false,
      code: generatedUniqueCode
    };

    setNewlyAwardedCoupon(newCoupon);

    // Save corresponding funny character letter containing gourmet tips
    const awardLetter = generateSpiritLetter(spirit, newCoupon.title, username || '나그네');
    const updatedLetters = [awardLetter, ...letters];
    saveLettersToLocal(updatedLetters);

    // Keep the spirit unlocked but reset energy back to 25, do NOT reset fedCount so their bonds grow stronger!
    const updatedSpirits = spirits.map((s) => {
      if (s.id === spirit.id) {
        return { ...s, energy: 25, petCount: 0 }; 
      }
      return s;
    });

    // Also auto-unlock the next secret spirit silhouette if there is one locked!
    const firstLocked = updatedSpirits.find(s => !s.isUnlocked);
    if (firstLocked) {
      firstLocked.isUnlocked = true;
      firstLocked.energy = 40;
    }

    setSpirits(updatedSpirits);
    setSelectedSpirit(updatedSpirits.find(s => s.id === spirit.id) || updatedSpirits[0]);

    // Save physical local coupon
    const newCouponsList = [newCoupon, ...coupons];
    saveCouponsToLocal(newCouponsList);

    // points boost bonus
    const nextScore = score + 150;
    setScore(nextScore);
    localStorage.setItem('goyo_user_score', nextScore.toString());

    sounds.playCowMoo();
    setTimeout(() => {
      sounds.playSuccess();
    }, 800);
  };

  const handleFinishReleaseAnimation = () => {
    setIsReleaseAnimating(false);
    setReleasingSpirit(null);
    setNewlyAwardedCoupon(null);
    setActiveTab('profile'); // Send directly to Profile tab which holds coupon list
    showToast('🎫 쿠폰함에 신규 웰니스 보해 교환 쿠폰이 안전하게 적립되었습니다!');
  };

  // Staff PIN Code Authentication Modal For Coupons
  const handleOpenStampVerification = (coupon: Coupon) => {
    triggerClick();
    setVerifyingCoupon(coupon);
    setStaffPin('');
    setPinError(false);
  };

  const handlePressPinDigit = (num: string) => {
    sounds.playClick();
    if (staffPin.length < 4) {
      const nextPin = staffPin + num;
      setStaffPin(nextPin);
      if (nextPin.length === 4) {
        // Automatically check PIN
        // Updated PIN according to the user request: strictly '0601'
        if (nextPin === '0601') {
          setTimeout(() => {
            const updatedCoupons = coupons.map(c => {
              if (c.id === verifyingCoupon?.id) {
                return { ...c, used: true };
              }
              return c;
            });
            saveCouponsToLocal(updatedCoupons);
            setVerifyingCoupon(null);
            sounds.playSuccess();
            showToast('✅ 횡성 스토어 가맹인 검증 완료! 쿠폰 도장을 꾹 찍었습니다!');
          }, 300);
        } else {
          setTimeout(() => {
            setPinError(true);
            setStaffPin('');
            sounds.playClick();
            showToast('❌ 검증코드가 맞지 않습니다. 점원의 전용 핀을 물어보세요.');
          }, 300);
        }
      }
    }
  };

  const handleBackspacePin = () => {
    sounds.playClick();
    setStaffPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  // Real Camera stream Scenic Recognition simulation
  const handleOpenScanner = (spot: SecretSpot) => {
    triggerClick();
    setScanningSpot(spot);
    setIsScannerOpen(true);
    setScannerStatus('requesting');
    setSceneryAnalysisState('idle');
    setSceneryAnalysisText('');
    setUploadedSceneryFile(null);
    setScannerTick(3);

    // Initialise real web device camera stream
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          cameraStreamRef.current = stream;
          setScannerStatus('streaming');
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('Camera stream initiation failed:', err);
          setScannerStatus('failed');
        });
    } else {
      setScannerStatus('failed');
    }
  };

  const handleAnalyzeSceneryInput = (isCorrectScenery: boolean, customLabel: string) => {
    triggerClick();
    setSceneryAnalysisState('analyzing');
    setSceneryAnalysisText('🌳 AI Lens가 지상 국지 피톤치드 정보 및 풍림 수맥을 분석 매치 대조 중입니다...');
    
    setTimeout(() => {
      if (isCorrectScenery) {
        setSceneryAnalysisState('checked');
        setSceneryAnalysisText(`🟢 확인! [장소 탐지 완료]: 이 풍경은 본 힐링 코스의 핵심 단서인 '${customLabel}'임이 성립되었습니다. (매칭도 99.1%)`);
        sounds.playSuccess();
        
        // Execute core spot unlocking logic
        if (scanningSpot) {
          const updatedSpots = secretSpots.map(s => s.id === scanningSpot.id ? { ...s, isRevealed: true } : s);
          setSecretSpots(updatedSpots);
          localStorage.setItem('goyo_secret_spots', JSON.stringify(updatedSpots));

          // Big points award bonus for true scenic search!
          const scoreAdd = 150;
          const nextScore = score + scoreAdd;
          setScore(nextScore);
          localStorage.setItem('goyo_user_score', nextScore.toString());

          // Unlock secret spirit "신비의 솔잎" safely!
          const updatedSpirits = spirits.map((sp) => {
            if (sp.id === 'secret1' && !sp.isUnlocked) {
              return { ...sp, isUnlocked: true, energy: 60 };
            }
            return sp;
          });
          setSpirits(updatedSpirits);
          localStorage.setItem('goyo_spirits', JSON.stringify(updatedSpirits));
          
          showToast(`🏆 축하합니다! '${scanningSpot.title}' 풍경 탐독에 성공하여 웰니스 스탬프를 찍었습니다. (+150pt)`);
        }
      } else {
        setSceneryAnalysisState('wrong');
        setSceneryAnalysisText(`❌ 분석 실패! 탐지된 풍림 피사체 [${customLabel}]는 본 웰니스 수련 거점의 단서 풍경과 전혀 부합하지 않습니다.`);
        sounds.playSuccess(); // plays notification beep/buzzer
      }
    }, 2000);
  };

  const handleUploadSceneryImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerClick();
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedSceneryFile(event.target.result as string);
          showToast('📸 실제 단서지 사진이 업로드되었습니다. 아래 AI 분석 기능을 구동하세요!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if ((window as any).goyoScannerInterval) {
      clearInterval((window as any).goyoScannerInterval);
    }
  };

  const handleCloseScanner = () => {
    triggerClick();
    stopCameraStream();
    setIsScannerOpen(false);
    setScanningSpot(null);
    setSceneryAnalysisState('idle');
    setUploadedSceneryFile(null);
  };

  // Sound generator for Natural sound frequencies inside application
  const playCustomAmbientSoundNode = (type: 'bird' | 'water' | 'wind', index: number) => {
    triggerClick();
    
    if (playingAuralIndex === index) {
      stopAllAmbientSounds();
      return;
    }

    stopAllAmbientSounds();
    setPlayingAuralIndex(index);
    showToast(`🌲 횡성 청량 대자연 치유음 조율 가동...`);

    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'bird') {
        // Synthesised bird tweets mimicking a real forest bird
        const intervalBird = setInterval(() => {
          if (audioContextRef.current) {
            const time = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.type = 'sine';
            const fBase = 2200 + Math.random() * 600;
            osc.frequency.setValueAtTime(fBase, time);
            osc.frequency.exponentialRampToValueAtTime(fBase + 550, time + 0.1);

            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.04, time + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

            osc.start(time);
            osc.stop(time + 0.12);
          }
        }, 650);
        (window as any).goyoBirdTimer = intervalBird;
      } 
      else if (type === 'water') {
        // Synthesised river stream dropping water bubbles
        const intervalWater = setInterval(() => {
          if (audioContextRef.current) {
            const time = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180 + Math.random() * 200, time);
            osc.frequency.exponentialRampToValueAtTime(450 + Math.random() * 150, time + 0.18);

            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.06, time + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

            osc.start(time);
            osc.stop(time + 0.24);
          }
        }, 250);
        (window as any).goyoWaterTimer = intervalWater;
      } 
      else if (type === 'wind') {
        // Synthesised warm gentle mountain wind currents
        const time = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(85, time);
        osc.frequency.linearRampToValueAtTime(125, time + 2);
        osc.frequency.linearRampToValueAtTime(70, time + 4);

        gainNode.gain.setValueAtTime(0.01, time);
        gainNode.gain.linearRampToValueAtTime(0.18, time + 1.8);
        gainNode.gain.linearRampToValueAtTime(0.04, time + 3.8);

        osc.start(time);
        osc.stop(time + 8.0);
        ambientOscillators.current.push({ osc, gain: gainNode });
      }
    } catch (err) {
      console.warn('Ambient synthesis initialization failure:', err);
    }
  };

  const stopAllAmbientSounds = () => {
    if ((window as any).goyoBirdTimer) clearInterval((window as any).goyoBirdTimer);
    if ((window as any).goyoWaterTimer) clearInterval((window as any).goyoWaterTimer);

    ambientOscillators.current.forEach(item => {
      try {
        item.osc.stop();
      } catch (e) {}
    });
    ambientOscillators.current = [];
    setPlayingAuralIndex(null);
  };

  // Registering user-written new journal mindfulness logs
  const handleAddNewJournalLog = (e: React.FormEvent) => {
    e.preventDefault();
    triggerClick();
    if (newLogTitle.trim() === '' || newLogQuote.trim() === '') {
      showToast('⚠️ 명상 일지의 제목과 치유 감상을 꼭 입력해 주세요!');
      return;
    }

    const customLogsItem: JournalLog = {
      id: `journal_log_${Date.now()}`,
      date: '2026.05.28 (오늘)',
      course: newLogCourse,
      title: newLogTitle,
      quote: `"${newLogQuote}"`,
      tags: ['🍃 고요로 자가일지', '👣 4,400보', '🔉 마음수량 소리'],
      duration: newLogTime
    };

    setLogs([customLogsItem, ...logs]);
    setShowNewLogModal(false);
    
    // Add small points reward for journaling
    const nextScore = score + 50;
    setScore(nextScore);
    localStorage.setItem('goyo_user_score', nextScore.toString());

    sounds.playSuccess();
    showToast('📝 오늘의 평온 가리개 일지가 고요 책갈피에 안전하게 끼워졌습니다. (+50pt)');

    setNewLogTitle('');
    setNewLogQuote('');
  };

  // Select trail from map & openbottom drawer sheet
  const handleSelectCourseOnMap = (course: Course) => {
    triggerClick();
    setSelectedCourse(course);
    setIsBottomSheetOpen(true);
  };

  return (
    <div 
      className="flex justify-center items-center min-h-screen bg-cover bg-center p-0 sm:p-4 md:p-6 select-none font-sans overflow-hidden"
      style={{ backgroundImage: "url('https://blog.kakaocdn.net/dna/cW0noR/dJMcabqQafF/AAAAAAAAAAAAAAAAAAAAAF0oLHY88_e3iqwMUFp67u6rVh7zKSm9HV6RTGo3CTLz/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1780239599&allow_ip=&allow_referer=&signature=%2BIgN8ahmUP2DbgI5JYEqkpJckFE%3D')" }}
    >
      
      {/* DEVICE CASING */}
      <div className="relative w-full max-w-[420px] h-[100vh] sm:h-[840px] bg-[#FAF9F5] overflow-hidden flex flex-col sm:rounded-[36px] sm:border-[8px] sm:border-[#222c24] shadow-2xl">
        
        {/* Toast Notification element inside device */}
        {toastMessage && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-2xl bg-[#1b251d] text-[#e8f5ee] font-bold text-[10.5px] border border-[#3e5f48]/80 shadow-xl flex items-center gap-2 animate-bounce w-[86%] max-w-[340px] justify-center text-center">
            <div className="w-2 h-2 rounded-full bg-[#7ab893] animate-pulse shrink-0"></div>
            <span>{toastMessage}</span>
          </div>
        )}
        
        {/* APP BRAND HEADER (No WiFi technical mockup to respect "와이파이 지워주고" mandate) */}
        <div className="bg-[#2a5539] text-[#e8f5ee] px-5 py-3.5 flex justify-between items-center shrink-0 z-30 shadow-md">
          <div className="flex items-center gap-2.5">
            <img src={goyoLogo} className="w-10 h-10 object-contain block shrink-0" />
            <div>
              <span className="font-display font-bold text-sm tracking-widest block uppercase text-white">고요로</span>
              <span className="text-[9.5px] text-[#a1d9b3] tracking-tight block -mt-0.5">GOYO-RO Wellness</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {isLoggedIn && (
              <div 
                onClick={() => { 
                  sounds.playClick(); 
                  if (score <= 0) {
                    setShowQuestPromptModal(true);
                  } else {
                    showToast(`✨ 고요 웰니스 보유 포인트: ${score} pt`);
                  }
                }}
                className="bg-[#FAF7EF] hover:bg-[#F5F1E5] text-[#2a5539] font-extrabold px-3.5 py-1.5 rounded-full text-[10.5px] border-2 border-[#D9D2C2] shadow-sm flex items-center gap-1 cursor-pointer active:scale-95 transition-all select-none shrink-0"
              >
                <span className="text-amber-500 text-[11px] shrink-0">⭐</span>
                <span>보유: <span className="font-extrabold text-[#2a5539] underline decoration-[#2a5539]/30 decoration-1 underline-offset-2">{score} pt</span></span>
              </div>
            )}
          </div>
        </div>

        {/* LOG-IN SCREEN SCREEN OVERLAY */}
        {!isLoggedIn && (
          <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#ebf5ee] via-[#fafdfb] to-[#f4f7f5] flex flex-col justify-between p-6 text-stone-800 overflow-y-auto">
            <div className="text-center pt-8">
              <div className="w-22 h-22 rounded-3xl bg-white/70 border border-stone-200/60 mx-auto flex items-center justify-center shadow-[0_10px_28px_rgba(42,85,57,0.08)] animate-float mb-3 overflow-hidden p-1.5">
                <img src={goyoLogo} className="w-18 h-18 object-contain" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-[0.2em] text-[#1b432a] font-display pl-4 block">고요로</h1>
              <p className="text-[10px] text-[#4a7c59] tracking-[0.4em] uppercase mt-1 opacity-80 font-bold font-display">G O Y O - R O</p>
              <p className="text-[11px] mt-3 text-stone-500 max-w-[280px] mx-auto leading-relaxed font-medium">
                스마트폰의 블루라이트에서 비로소 잠시 벗어나,<br />한우 누리 대초원 및 참잣나무 숲의 평화를 마주하세요.
              </p>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="bg-white/95 border border-stone-200/85 p-6 rounded-[28px] flex flex-col gap-3.5 shadow-[0_12px_40px_rgba(42,85,57,0.08)] backdrop-blur-md my-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold tracking-wide text-[#234e33]">🧘 웰니스 디톡스 로그인</h3>
                  <span className="text-[9px] text-[#4a7c59] bg-emerald-50 px-2 py-0.5 rounded-full font-bold">인증 모드</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-stone-400 font-bold">가입 닉네임 (ID)</label>
                  <input 
                    type="text" 
                    value={userIdInput}
                    onChange={(e) => { setUserIdInput(e.target.value); setLoginError(null); }}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-[#4a7c59] focus:bg-white" 
                    placeholder="예: goyo"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-stone-400 font-bold">비밀번호</label>
                  <input 
                    type="password" 
                    value={userPasswordInput}
                    onChange={(e) => { setUserPasswordInput(e.target.value); setLoginError(null); }}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs tracking-widest text-stone-800 focus:outline-none focus:border-[#4a7c59] focus:bg-white" 
                    placeholder="패스워드를 입력하세요"
                  />
                </div>

                {loginError && (
                  <p className="text-[10.5px] text-red-600 font-extrabold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100 flex items-center gap-1.5 animate-pulse">
                    <span>⚠️ {loginError}</span>
                  </p>
                )}

                <button 
                  type="submit"
                  className="w-full bg-[#4a7c59] hover:bg-[#3d6649] active:scale-[0.98] transition-transform text-white font-bold text-xs py-3 rounded-xl mt-1.5 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>수련 시작하기</span>
                  <ChevronRight size={14} />
                </button>

                <div className="text-center mt-2 pt-2 border-t border-stone-100 flex flex-col gap-2">
                  <div>
                    <p className="text-[10px] text-stone-400">비밀번호를 분실해 헤매시나요?</p>
                    <button
                      type="button"
                      onClick={() => { triggerClick(); setFoundPasswordResult(null); setAuthMode('find_password'); }}
                      className="text-[11px] text-amber-700 font-extrabold underline mt-0.5 cursor-pointer hover:text-amber-900 focus:outline-none"
                    >
                      비밀번호 찾기
                    </button>
                  </div>

                  <div className="border-t border-stone-100/55 pt-2">
                    <p className="text-[10px] text-stone-400">아직 회원이 아니신가요?</p>
                    <button
                      type="button"
                      onClick={() => { triggerClick(); setAuthMode('signup'); }}
                      className="text-xs text-[#2a5539] font-bold underline mt-0.5 cursor-pointer hover:text-emerald-800 focus:outline-none"
                    >
                      🌱 10초 만에 회원가입하기
                    </button>
                  </div>
                </div>
              </form>
            ) : authMode === 'signup' ? (
              <form onSubmit={handleSignup} className="bg-white/95 border border-stone-200/85 p-6 rounded-[28px] flex flex-col gap-3.5 shadow-[0_12px_40px_rgba(42,85,57,0.08)] backdrop-blur-md my-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold tracking-wide text-[#234e33]">✨ 웰니스 신규 가입</h3>
                  <span className="text-[9px] text-[#4a7c59] bg-emerald-50 px-2 py-0.5 rounded-full font-bold">신규 등록</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-stone-400 font-bold">닉네임 (아이디로 사용)</label>
                  <input 
                    type="text" 
                    value={signupNickname}
                    onChange={(e) => setSignupNickname(e.target.value)}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-[#4a7c59] focus:bg-white" 
                    placeholder="예: goyolove (영문/한글 자유)"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-stone-400 font-bold">이름 (실명 또는 칭호)</label>
                  <input 
                    type="text" 
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-[#4a7c59] focus:bg-white" 
                    placeholder="예: 홍길동"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <label className="text-[10px] text-stone-400 font-bold">비밀번호</label>
                    <span className="text-[8.5px] text-red-500 font-bold">* 특수문자 필수 1개 포함</span>
                  </div>
                  <input 
                    type="password" 
                    value={signupPassword}
                    onChange={(e) => { setSignupPassword(e.target.value); setSignupError(null); }}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs tracking-widest text-stone-800 focus:outline-none focus:border-[#4a7c59] focus:bg-white" 
                    placeholder="특수문자(!,@,#,$ 등)를 포함해 주세요"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <label className="text-[10px] text-stone-400 font-bold">비밀번호 찾기 질문: 자신이 좋아하는 것은?</label>
                    <span className="text-[8.5px] text-amber-600 font-bold">* 비번 분실조회용 답변</span>
                  </div>
                  <input 
                    type="text" 
                    value={signupSecretAnswer}
                    onChange={(e) => { setSignupSecretAnswer(e.target.value); setSignupError(null); }}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-[#4a7c59] focus:bg-white" 
                    placeholder="예: 강아지, 피자, 하이킹 (답변 입력)"
                  />
                </div>

                {signupError && (
                  <p className="text-[10.5px] text-red-600 font-extrabold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100 flex items-center gap-1.5 animate-pulse">
                    <span>⚠️ {signupError}</span>
                  </p>
                )}

                <button 
                  type="submit"
                  className="w-full bg-[#2a5539] hover:bg-[#1f422b] active:scale-[0.98] transition-transform text-white font-bold text-xs py-3 rounded-xl mt-1.5 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>회원가입 완료</span>
                  <Check size={14} />
                </button>

                <div className="text-center mt-2 pt-2 border-t border-stone-100 flex justify-between px-1">
                  <button
                    type="button"
                    onClick={() => { triggerClick(); setAuthMode('login'); }}
                    className="text-[11px] text-stone-500 font-bold underline cursor-pointer hover:text-stone-700 focus:outline-none"
                  >
                    🔒 기존 로그인하기
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerClick(); setFoundPasswordResult(null); setAuthMode('find_password'); }}
                    className="text-[11px] text-amber-700 font-bold underline cursor-pointer hover:text-amber-800 focus:outline-none"
                  >
                    🔑 비밀번호 찾기
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFindPassword} className="bg-white/95 border border-stone-200/85 p-6 rounded-[28px] flex flex-col gap-3 shadow-[0_12px_40px_rgba(42,85,57,0.08)] backdrop-blur-md my-4 animate-fade-in w-full">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold tracking-wide text-amber-800">🔑 비밀번호 찾기</h3>
                  <span className="text-[9px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold">비번 조회</span>
                </div>
                
                <p className="text-[9.5px] text-stone-500 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60">
                  가입하실 때 기입한 닉네임, 본인 실명, 그리고 비밀번호 찾기 문답(내가 좋아하는 것)이 모두 맞아야 비밀번호를 보여드립니다.
                </p>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-stone-400 font-bold">가입 닉네임 (ID)</label>
                  <input 
                    type="text" 
                    value={findPasswordNickname}
                    onChange={(e) => { setFindPasswordNickname(e.target.value); setFindPasswordError(null); }}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-amber-600 focus:bg-white" 
                    placeholder="예: goyo"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-stone-400 font-bold">본인 실명 (가입하신 이름)</label>
                  <input 
                    type="text" 
                    value={findPasswordName}
                    onChange={(e) => { setFindPasswordName(e.target.value); setFindPasswordError(null); }}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-amber-600 focus:bg-white" 
                    placeholder="예: 고요"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-stone-400 font-bold">비밀번호 찾기 질문: 자신이 좋아하는 것은?</label>
                  <input 
                    type="text" 
                    value={findPasswordSecretAnswer}
                    onChange={(e) => { setFindPasswordSecretAnswer(e.target.value); setFindPasswordError(null); }}
                    className="bg-stone-50/80 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-amber-600 focus:bg-white" 
                    placeholder="가입할 때 적으신 소중한 답 입력"
                  />
                </div>

                {findPasswordError && (
                  <p className="text-[10.5px] text-red-600 font-extrabold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100 flex items-center gap-1.5 animate-pulse">
                    <span>⚠️ {findPasswordError}</span>
                  </p>
                )}

                <button 
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-transform text-white font-bold text-xs py-2.5 rounded-xl mt-1 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Search size={14} />
                  <span>비밀번호 즉시 조회</span>
                </button>

                {foundPasswordResult !== null && (
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center animate-scale-up mt-1.5">
                    <p className="text-[9.5px] text-emerald-800 font-bold">가입하신 비밀번호 조회 결과</p>
                    <p className="text-xs font-extrabold text-[#2a5539] mt-1 select-text bg-white px-2 py-1 rounded-lg border border-emerald-100 font-mono tracking-widest">{foundPasswordResult}</p>
                    <button
                      type="button"
                      onClick={() => {
                        triggerClick();
                        setUserIdInput(findPasswordNickname);
                        setUserPasswordInput(foundPasswordResult);
                        setAuthMode('login');
                        setFoundPasswordResult(null);
                        setFindPasswordNickname('');
                        setFindPasswordName('');
                      }}
                      className="text-[9px] text-[#2a5539] font-black underline mt-1.5 block mx-auto cursor-pointer"
                    >
                      💡 바로 채운 뒤 로그인하러 가기
                    </button>
                  </div>
                )}

                <div className="text-center mt-1.5 pt-2 border-t border-stone-100 flex justify-between px-1">
                  <button
                    type="button"
                    onClick={() => { triggerClick(); setAuthMode('login'); setFoundPasswordResult(null); }}
                    className="text-[10.5px] text-[#2a5539] font-bold underline cursor-pointer hover:text-emerald-800 focus:outline-none"
                  >
                    🔒 로그인 화면 가기
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerClick(); setAuthMode('signup'); setFoundPasswordResult(null); }}
                    className="text-[10.5px] text-stone-500 font-bold underline cursor-pointer hover:text-stone-700 focus:outline-none"
                  >
                    🌱 회원가입 화면 가기
                  </button>
                </div>
              </form>
            )}

            <div className="text-center text-[10px] text-stone-400 pb-3 tracking-wider font-semibold">
              디지털인문예술입문 x 감자도리
            </div>
          </div>
        )}

        {/* ACTIVE TIMER OVERLAY SCREEN */}
        {timerActive && (
          <div className="absolute inset-0 z-40 bg-gradient-to-b from-[#142319] via-[#213e2a] to-[#0e1610] text-white flex flex-col justify-between p-6">
            <div className="flex justify-between items-center pt-3 gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
                <span className="text-[10px] text-white/90 font-semibold tracking-wider truncate">디톡스 라이브 수련 중</span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <div className="bg-[#1b3423] px-2.5 py-1 rounded-full text-[9px] border border-white/10 text-stone-200">
                  보유: <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">{score} pt</span>
                </div>
                <div className="bg-[#1b3423] px-2.5 py-1 rounded-full text-[9px] border border-white/10 text-[#8ad5a5] font-bold">
                  +150 pt
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center my-auto">
              {/* Dynamic egg transformations */}
              <div className="w-28 h-28 rounded-full bg-white/5 flex items-center justify-center text-5xl shadow-inner animate-float relative mb-6 border border-white/10">
                <div className="absolute inset-0 rounded-full border border-[#7ab893]/35 animate-pulse-soft"></div>
                <span>
                  {timerSeconds < timerTotal * 0.15 ? '🐣' : 
                   timerSeconds < timerTotal * 0.45 ? '💫' :
                   timerSeconds < timerTotal * 0.75 ? '🌱' : '🥚'}
                </span>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-stone-300 font-semibold tracking-widest uppercase mb-1.5">고요 정량의 탄생 카운트다운</p>
                <h1 className="text-4xl font-mono tracking-wider font-extrabold text-[#7ab893]">
                  {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}
                  <span className="animate-pulse mx-0.5 text-white/30">:</span>
                  {(timerSeconds % 60).toString().padStart(2, '0')}
                </h1>
                
                <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden mx-auto mt-4">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7ab893] to-[#4a7c59] transition-all duration-1000"
                    style={{ width: `${((timerTotal - timerSeconds) / timerTotal) * 100}%` }}
                  ></div>
                </div>

                <p className="text-xs text-stone-200 py-3.5 max-w-[270px] mx-auto leading-relaxed">
                  {timerSeconds > timerTotal * 0.5 
                    ? '폰을 편안히 뒤집어 두고 흘러가는 바람소리를 즐겨보세요.' 
                    : '내면 가득 푸른 강바람이 깃듭니다. 깊이 명상하며 마음을 깨끗이 비워 비우세요.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pb-2">
              <div className="flex justify-center gap-3">
                <button 
                  onClick={handlePauseToggle}
                  className="flex-1 bg-white/10 hover:bg-white/20 active:scale-95 duration-75 py-3 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer border border-white/5"
                >
                  {isTimerPaused ? <Play size={12} /> : <Pause size={12} />}
                  <span>{isTimerPaused ? '정화 이어가기' : '일시정지'}</span>
                </button>
                
                <button 
                  onClick={handleStopRequest}
                  className="flex-1 bg-red-950/40 hover:bg-red-900/40 text-red-300 py-3 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer border border-red-900/30"
                >
                  <X size={12} />
                  <span>중단하고 퇴장</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STOP DIALOG WARNING OVERLAY */}
        {showWarningModal && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
            <div className="bg-[#FAF9F5] text-[#2d3a2e] w-full max-w-[320px] rounded-[28px] p-5 shadow-2xl border border-stone-200">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto">
                <ShieldAlert size={22} />
              </div>

              <div className="text-center mt-3">
                <h3 className="text-base font-bold">정말로 멈추시겠습니까?</h3>
                <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                  명상 흐름이 중간에 끊어지면,<br />
                  <span className="font-semibold text-red-600">방생에 쓸 소중한 정령 기력이 소실</span>됩니다!<br />
                  조금만 참으시면 로컬 쿠폰을 받을 수 있어요.
                </p>
              </div>

              <div className="flex gap-2 mt-4 text-xs font-semibold">
                <button 
                  onClick={() => { triggerClick(); setShowWarningModal(false); }}
                  className="flex-1 bg-[#4a7c59] text-white py-2.5 rounded-xl cursor-pointer"
                >
                  계속해서 명유하기
                </button>
                <button 
                  onClick={confirmCancelTimer}
                  className="flex-1 bg-stone-100 text-stone-500 border border-stone-200 py-2.5 rounded-xl cursor-pointer"
                >
                  네, 중단할래요
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAGICAL CELEBRATING SPIRIT GRATITUDE OVERLAY (정령의 고요한 은혜 선물 애니메이션) */}
        {isReleaseAnimating && releasingSpirit && (
          <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#112417] via-[#162e1e] to-[#0e1c12] flex flex-col justify-between p-6 text-white text-center select-none overflow-y-auto no-scrollbar">
            
            {/* Header branding */}
            <div className="pt-6 shrink-0">
              <span className="inline-block bg-[#ebd594]/20 border border-[#ebd594]/35 text-[#ecd69b] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider scale-95 md:scale-100">
                ✨ GOYO SPIRIT BLESSING VOUCHER
              </span>
              <h2 className="text-xl font-extrabold mt-3 tracking-tight text-[#fdfcf7] drop-shadow-md">
                친해진 정령 <span className="text-[#ebd594]">「{releasingSpirit.name}」</span>의 보은 선물 🎁
              </h2>
              <p className="text-[11px] text-emerald-100/70 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                정성스레 마음과 온기를 쏟아준 나그네 {username || '님'}께 감사하며,<br />
                정령이 남기고 간 횡성 가맹점의 웰니스 교환권을 가슴 편히 받아보세요.
              </p>
            </div>

            {/* Central Combined Presentation Area (Spirit Floating + Perforated Ticket Card) */}
            <div className="my-auto py-4 flex flex-col items-center justify-center gap-5 w-full max-w-[340px] mx-auto shrink-0">
              
              {/* Spirit Blessing Aura Circle */}
              <div className="relative flex flex-col items-center justify-center">
                <div className="absolute w-36 h-36 rounded-full bg-[#ebd594]/10 blur-2xl animate-pulse-soft"></div>
                <div className="absolute w-20 h-20 rounded-full border border-[#ebd594]/20 animate-ping-slow pointer-events-none"></div>
                
                {/* Floating Spirit Presentation */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-24 h-24 flex items-center justify-center animate-float">
                    {releasingSpirit.imageUrl ? (
                      <TransparentImage 
                        src={releasingSpirit.imageUrl} 
                        alt={releasingSpirit.name} 
                        className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(235,213,148,0.4)]"
                      />
                    ) : (
                      <span className="text-6xl drop-shadow-2xl">{releasingSpirit.emoji}</span>
                    )}
                  </div>
                  <span className="mt-1 bg-stone-900/60 backdrop-blur-xs border border-white/10 px-2 py-0.5 rounded-full text-[9px] text-[#e3c988] font-bold uppercase tracking-wider">
                    {releasingSpirit.rarity} SPIRIT
                  </span>
                </div>
              </div>

              {/* HIGH-CONTRAST SKEUOMORPHIC TICKET DESIGN (쿠폰 세부 정보 강조) */}
              <div className="relative w-full bg-[#FAF9F5] text-stone-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#ebd594]/40 overflow-hidden text-left flex flex-col p-5 transition-transform duration-300 hover:scale-[1.01]">
                
                {/* Ticket Top Background pattern overlay */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ebd594] via-[#bfa265] to-[#ebd594]"></div>
                
                {/* Coupon Category/Badge Area */}
                <div className="flex justify-between items-start pt-1">
                  <span className="text-[9.5px] font-bold text-[#2a5539] tracking-wider uppercase bg-[#e8f5ee] px-2 py-0.5 rounded border border-emerald-900/10">
                    LOCAL WELLNESS CARD 🎫
                  </span>
                  <span className="text-[10px] font-medium text-stone-400">고요로 제휴처</span>
                </div>

                {/* Main Content Area */}
                <div className="mt-3.5">
                  <h3 className="text-sm font-extrabold text-stone-900 leading-snug tracking-tight">
                    {newlyAwardedCoupon ? newlyAwardedCoupon.title : '🎁 횡성 가맹스토어 웰니스 보은 쿠폰'}
                  </h3>
                  
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>사용 제공처:</span>
                    <span className="font-extrabold text-stone-700">{newlyAwardedCoupon?.provider || '삼거리 명가 안흥찐빵 본점'}</span>
                  </div>
                </div>

                {/* SENSATIONAL BENEFITS CALLOUT */}
                <div className="mt-4 bg-[#e8f5ee] border border-emerald-900/10 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">스페셜 혜택 (Benefits)</span>
                    <span className="text-[12.5px] font-black text-[#1a3c25] leading-snug mt-0.5">
                      {newlyAwardedCoupon?.discount || '대표 교환 혜택 제공'}
                    </span>
                  </div>
                  <span className="text-xl">🍵</span>
                </div>

                {/* REAL TICKET PERFORATION/HOLE-PUNCH CUTOUTS (CSS 완벽 구현) */}
                <div className="border-t-[1.5px] border-dashed border-stone-200/80 my-4 relative">
                  {/* Left punch circle */}
                  <div className="absolute -left-[27px] -top-[10px] w-5 h-5 rounded-full bg-[#162e1e] border-r-[1.5px] border-[#ebd594]/20"></div>
                  {/* Right punch circle */}
                  <div className="absolute -right-[27px] -top-[10px] w-5 h-5 rounded-full bg-[#162e1e] border-l-[1.5px] border-[#ebd594]/20"></div>
                </div>

                {/* Ticket Stub (Voucher Code & Serial Details) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[8.5px] text-stone-400 font-bold tracking-widest uppercase">VOUCHER CODE</span>
                      <span className="font-mono text-xs font-black tracking-widest text-[#a67c52] bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded mt-0.5 select-all">
                        {newlyAwardedCoupon?.code || 'GY-GIFT-FREE'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8.5px] text-stone-400 font-bold uppercase">VALID THRU</span>
                      <span className="text-[10px] font-bold text-stone-600 mt-0.5">
                        {newlyAwardedCoupon?.expireDate || '2026.12.31'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-stone-400 font-medium leading-relaxed mt-1 text-center bg-stone-50 border border-stone-100 py-1.5 rounded-lg">
                    💡 이 쿠폰은 <span className="font-bold text-stone-600">내 프로필 &gt; 로컬 쿠폰첩</span>에서 직원 코드를 입력하여 현장에서 실제 사용이 가능합니다.
                  </p>
                </div>

              </div>
            </div>

            {/* Bottom persistent CTA button */}
            <div className="pb-6 px-2 shrink-0">
              <button 
                onClick={handleFinishReleaseAnimation}
                className="w-full bg-gradient-to-r from-[#ebd594] to-[#f4e2b0] hover:from-[#e8cb7b] hover:to-[#ebd594] text-stone-950 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 duration-150 active:scale-[0.98] shadow-lg shadow-amber-950/20 border-b-2 border-amber-600/30 font-display"
              >
                <span>내 포켓 쿠폰함에서 확인하기</span>
                <ChevronRight size={14} className="animate-pulse" />
              </button>
            </div>

          </div>
        )}

        {/* VERIFICATION PIN MODAL (점원 전용 검증 코드 입력기 패널) */}
        {verifyingCoupon && (
          <div className="absolute inset-0 z-50 bg-black/75 flex items-end justify-center">
            <div className="bg-[#FAF9F5] text-[#2d3a2e] w-full rounded-t-[32px] p-6 shadow-2xl flex flex-col gap-4 animate-slide-up">
              
              <div className="flex justify-between items-center border-b border-stone-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎫</span>
                  <div>
                    <h4 className="text-xs font-bold text-stone-500">스토어 현장 사용 대기</h4>
                    <h3 className="text-sm font-extrabold text-[#233f2a] tracking-tight">{verifyingCoupon.title}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => { triggerClick(); setVerifyingCoupon(null); }}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-center py-2">
                <p className="text-sm text-red-600 font-extrabold leading-relaxed mb-1">
                  📢 "직원에게 코드를 입력해달라고 하세요!"
                </p>
                <p className="text-[11.5px] text-stone-600 mt-1.5 leading-normal font-semibold">
                  본 쿠폰은 매장 결제 시점 현장 전용 혜택입니다.<br />
                  가맹점의 직원분께 제시하신 뒤, 직원 전용 4자리 핀번호를 입력받아 인증을 완결해 주세요!
                </p>
                
                {/* Visual PIN digit holders */}
                <div className="flex justify-center gap-3.5 mt-5">
                  {[0, 1, 2, 3].map((idx) => (
                    <div 
                      key={idx} 
                      className={`w-10 h-11 rounded-xl border-2 flex items-center justify-center font-bold text-base transition-all ${
                        pinError 
                          ? 'border-red-400 bg-red-50 text-red-700 animate-shake' 
                          : staffPin.length > idx 
                          ? 'border-[#4a7c59] bg-[#e8f5ee] text-[#2a5539]' 
                          : 'border-stone-300 bg-white text-stone-400'
                      }`}
                    >
                      {staffPin.length > idx ? '●' : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* STYLISH GRAPHICAL DIALPAD */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto mt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button 
                    key={num} 
                    onClick={() => handlePressPinDigit(num)}
                    className="w-16 h-11 rounded-xl bg-white hover:bg-stone-100 active:scale-95 duration-75 text-stone-700 font-bold text-sm border border-stone-200/60 shadow-sm flex items-center justify-center cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={() => { sounds.playClick(); setStaffPin(''); setPinError(false); }}
                  className="w-16 h-11 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-500 font-bold text-xs border border-stone-200 shadow-sm flex items-center justify-center cursor-pointer"
                >
                  화치
                </button>
                <button 
                  onClick={() => handlePressPinDigit('0')}
                  className="w-16 h-11 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-sm border border-stone-200/60 shadow-sm flex items-center justify-center cursor-pointer"
                >
                  0
                </button>
                <button 
                  onClick={handleBackspacePin}
                  className="w-16 h-11 rounded-xl bg-[#4a7c59] text-white font-bold text-sm shadow flex items-center justify-center cursor-pointer"
                >
                  ←
                </button>
              </div>

            </div>
          </div>
        )}

        {/* NATIVE REAL CAMERA SCENIC RECOGNITION OVERLAY PANEL */}
        {isScannerOpen && scanningSpot && (
          <div className="absolute inset-0 z-50 bg-[#0d100e] text-white flex flex-col justify-between p-5 overflow-y-auto no-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[11px] text-[#7ab893] font-extrabold uppercase tracking-widest">Goyo AI Scenic Lens</span>
              </div>
              <button 
                onClick={handleCloseScanner}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Title Block */}
            <div className="text-center my-3 shrink-0">
              <span className="text-[9px] bg-[#2a5539]/80 text-[#a3dcba] px-2.5 py-0.5 rounded font-black tracking-wider border border-emerald-500/20">
                수색 대기구역: {scanningSpot.location}
              </span>
              <h2 className="text-sm font-black text-[#e1f0e6] mt-1.5">{scanningSpot.title}</h2>
              <p className="text-[10px] text-white/50 mt-1 px-3">
                오프라인 힌트서: "{scanningSpot.hint.substring(0, 50)}..."
              </p>
            </div>

            {/* Main AI Viewport */}
            <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden border-2 border-[#4a7c59]/30 bg-[#070908] flex flex-col items-center justify-center shrink-0 shadow-lg">
              
              {/* If uploader has file, show that scenery file */}
              {uploadedSceneryFile ? (
                <img 
                  src={uploadedSceneryFile} 
                  className="w-full h-full object-cover" 
                  alt="Uploaded scenery" 
                />
              ) : (
                /* Else show streaming video */
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover ${scannerStatus === 'streaming' ? 'block' : 'hidden'}`}
                ></video>
              )}

              {/* Viewport Overlay state HUD */}
              {sceneryAnalysisState === 'idle' && (
                <div className="absolute inset-0 flex flex-col justify-between p-4 bg-black/35 pointer-events-none select-none">
                  {/* Scope Corners */}
                  <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-emerald-400"></div>
                  <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-emerald-400"></div>
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-emerald-400"></div>
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-emerald-400"></div>
                  
                  {/* Scanner laser lines */}
                  <div className="w-full h-0.5 bg-emerald-500/45 animate-pulse-soft absolute top-1/2 left-0 right-0"></div>
                  
                  <div className="text-center text-[9px] text-[#7ab893] bg-[#111612]/90 px-2.5 py-1 rounded-full border border-emerald-500/25 self-center mt-2 font-mono uppercase tracking-widest leading-none">
                    Lens Online • Ready for Analysis
                  </div>
                </div>
              )}

              {/* Analyzing progress bar */}
              {sceneryAnalysisState === 'analyzing' && (
                <div className="absolute inset-0 bg-[#0a0d0c]/90 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-10 h-10 rounded-full border-4 border-l-emerald-500 border-r-transparent border-t-transparent border-b-transparent animate-spin mb-3"></div>
                  <div className="text-emerald-400 text-xs font-black animate-pulse uppercase tracking-wider">AI Scenery Matching...</div>
                  <p className="text-[10px] text-white/55 mt-1.5 leading-relaxed">
                    렌즈 시야각 내 고요 성분과 횡성 자생림 분포를 연산 중입니다.
                  </p>
                </div>
              )}

              {/* Success Stamp confirmation: "확인! 스탬프 날인 완료" */}
              {sceneryAnalysisState === 'checked' && (
                <div className="absolute inset-0 bg-[#162a1e]/95 flex flex-col items-center justify-center p-5 text-center animate-fade-in relative">
                  
                  {/* Huge Decorative Stamp watermark overlay */}
                  <div className="absolute w-28 h-28 border-4 border-dashed border-emerald-400/25 rounded-full flex items-center justify-center animate-spin-slow rotate-12 pointer-events-none">
                    <span className="text-[10px] font-black tracking-widest text-emerald-400/25 uppercase">GOYO SANCTUARY</span>
                  </div>

                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_#10b98140]">
                    <CheckCircle2 size={30} className="animate-bounce" />
                  </div>
                  
                  {/* Big Stamp Seal */}
                  <div className="bg-[#10b981] text-[#faf9f5] text-[11px] tracking-widest font-black px-4 py-1.5 rounded-lg border-2 border-emerald-300 shadow-md rotate-[-4deg] my-1 uppercase">
                     Seal Verified • 확인!
                  </div>
                  
                  <p className="text-[11px] text-[#caefd7] font-bold mt-1.5">거점 수색 인증에 성공하였습니다.</p>
                  <p className="text-[9px] text-white/50 mt-1">이 스팟에 꿀맛 보상스탬프가 날인되었습니다.</p>
                </div>
              )}

              {/* Fail / Wrong scenery detection */}
              {sceneryAnalysisState === 'wrong' && (
                <div className="absolute inset-0 bg-[#291717]/95 flex flex-col items-center justify-center p-5 text-center animate-fade-in">
                  <div className="w-11 h-11 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-2">
                    <AlertTriangle size={24} className="animate-pulse" />
                  </div>
                  <div className="bg-rose-600 text-white text-[10px] uppercase font-black px-3 py-1 rounded border border-rose-400 rotate-[4deg] my-0.5">
                    Mismatch • 전혀 아님!
                  </div>
                  <p className="text-[11px] text-rose-200 mt-1.5 font-bold">도심/부적합 풍경 검출</p>
                  <p className="text-[9.5px] text-white/40 mt-1.5 leading-relaxed">
                    힌트북에 지정된 횡성 오프라인 실물 경관이 아닙니다. 다시 시도하세요.
                  </p>
                </div>
              )}
            </div>

            {/* Custom file upload input and Simulators */}
            <div className="my-3 flex flex-col gap-2 bg-[#171d1a] p-3 rounded-2xl border border-[#4a7c59]/10 shrink-0">
              
              {/* Standard uploader */}
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-white/70 font-semibold">실제 현장 스냅샷 사진 분석</span>
                <label className="bg-[#2a5539] hover:bg-[#346846] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition-all border border-emerald-500/20 flex items-center gap-1">
                  <Camera size={11} />
                  <span>사진 업로드 / 촬영</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleUploadSceneryImage} 
                    className="hidden" 
                  />
                </label>
              </div>

              {uploadedSceneryFile && sceneryAnalysisState !== 'analyzing' && sceneryAnalysisState !== 'checked' && (
                <button
                  onClick={() => {
                    const isS1 = scanningSpot.id === 's1';
                    const isS2 = scanningSpot.id === 's2';
                    const isS3 = scanningSpot.id === 's3';
                    const isS4 = scanningSpot.id === 's4';
                    
                    handleAnalyzeSceneryInput(true, isS1 ? '600년 고목 잣나무림' : isS2 ? '횡성 호수길 솔나무림' : isS3 ? '안흥 전통 가마솥' : '태기산 풍차');
                  }}
                  className="w-full bg-[#10b981] hover:bg-[#12a170] text-black font-extrabold text-[10.5px] py-1.5 rounded-lg mt-1 flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <span>📷 업로드된 실제 사진 매칭 분석 구동</span>
                </button>
              )}

              {/* Scenery Selector Simulator Presets */}
              <div className="mt-2 border-t border-white/5 pt-2 flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9.5px] text-[#73927d] font-bold">오프라인 현장 위치 가상 테스트 (학습용)</span>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-300 px-1.5 rounded border border-emerald-500/20">Beta Scanner</span>
                </div>
                
                {/* Simulated Scenery buttons based on current location */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    disabled={sceneryAnalysisState === 'analyzing'}
                    onClick={() => {
                      const isS1 = scanningSpot.id === 's1';
                      const isS2 = scanningSpot.id === 's2';
                      const isS3 = scanningSpot.id === 's3';
                      const isS4 = scanningSpot.id === 's4';
                      
                      const label = isS1 ? '600년 수령 보호수 잣나무림' : isS2 ? '횡성 호수길 5코스 울창한 솔나무림' : isS3 ? '안흥 백가마 전통 솥뚜껑 장독대' : '태기산 풍력발전기 7호기 수직탑';
                      handleAnalyzeSceneryInput(true, label);
                    }}
                    className="bg-[#234e33]/50 hover:bg-[#234e33]/90 text-left text-white p-2 rounded-xl border border-emerald-500/20 flex flex-col gap-0.5 justify-center cursor-pointer transition-all"
                  >
                    <span className="text-[10px] font-black text-[#a2e0b5]">🌲 [올바른 단서지 풍경]</span>
                    <span className="text-[8px] text-white/60 leading-tight">
                      {scanningSpot.id === 's1' ? '삼나무 계곡 고목' : scanningSpot.id === 's2' ? '호수길 수변 솔나무밭' : scanningSpot.id === 's3' ? '안흥 김 모락 장독대' : '태기산 안개바람 옹달샘'}
                    </span>
                  </button>

                  <button
                    disabled={sceneryAnalysisState === 'analyzing'}
                    onClick={() => {
                      handleAnalyzeSceneryInput(false, '서울 도심 빌딩과 아스팔트 차선 로드');
                    }}
                    className="bg-rose-950/20 hover:bg-rose-950/50 text-left text-white p-2 rounded-xl border border-rose-500/10 flex flex-col gap-0.5 justify-center cursor-pointer transition-all"
                  >
                    <span className="text-[10px] font-black text-rose-300">🏙️ [어긋난 오인 풍경]</span>
                    <span className="text-[8px] text-white/50 leading-tight">서울 강남 빌딩 사거리</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Analysis Diagnostics Output Display block */}
            <div className="text-center font-semibold shrink-0">
              {sceneryAnalysisState === 'idle' && (
                <div className="bg-[#122319] border border-emerald-500/15 py-3 px-4 rounded-2xl">
                  <p className="text-[10.5px] text-[#93c7a5] font-bold">오프라인 거점 풍경 대조</p>
                  <p className="text-[9.5px] text-white/50 mt-1 font-medium">단서 사진을 촬영하거나 위의 올바른 풍경을 선택하여 렌즈 분석을 돌려 주세요.</p>
                </div>
              )}

              {sceneryAnalysisState === 'analyzing' && (
                <div className="bg-white/5 py-2.5 px-4 rounded-xl leading-relaxed text-stone-300 text-[10px] animate-pulse">
                  {sceneryAnalysisText}
                </div>
              )}

              {sceneryAnalysisState === 'checked' && (
                <div className="bg-emerald-900/30 border border-emerald-500/20 py-2.5 px-4 rounded-xl text-emerald-300 text-[10px] font-black leading-snug">
                  {sceneryAnalysisText}
                </div>
              )}

              {sceneryAnalysisState === 'wrong' && (
                <div className="bg-rose-950/30 border border-rose-500/15 py-2.5 px-4 rounded-xl text-rose-300 text-[10px] font-medium leading-relaxed">
                  {sceneryAnalysisText}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex gap-2.5 mt-3 shrink-0">
              {sceneryAnalysisState === 'wrong' && (
                <button 
                  onClick={() => {
                    triggerClick();
                    setSceneryAnalysisState('idle');
                    setUploadedSceneryFile(null);
                  }}
                  className="flex-1 bg-[#2f1d1d] hover:bg-[#3f2525] text-[#ff8f8f] font-black text-xs py-2.5 rounded-xl border border-rose-900 cursor-pointer"
                >
                  🔄 다시 풍경 촬영하기
                </button>
              )}
              
              <button 
                onClick={handleCloseScanner}
                className="flex-1 bg-[#1c221e] hover:bg-[#252f28] text-white/90 font-extrabold text-xs py-2.5 rounded-xl border border-white/5 cursor-pointer"
              >
                닫기
              </button>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* APP MAIN TABS CONTAINER */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 relative">
          
          {/* TAB 1: HOME (🌱 고요 홈 탭) */}
          {activeTab === 'home' && (
            <div className="animate-fade-in">
              
              {/* BRAND GREETINGS (BENTO SECTION 1) */}
              <div className="bg-gradient-to-b from-[#2a5539] to-[#3a6e4d] p-5 pt-6 text-white relative">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold tracking-widest uppercase bg-[#1f3d28]/75 text-[#ccefd3] px-2.5 py-0.5 rounded-full border border-emerald-950/20">
                        🌱 사색의 정원사
                      </span>
                    </div>
                    <h2 className="text-xl font-bold font-display mt-2">반갑습니다, {username} 님</h2>
                    <p className="text-xs text-[#b8dfc4] mt-0.5">맑고 따뜻한 횡성의 자연이 오늘도 비가 내린 뒤 맑게 개어 있습니다.</p>
                  </div>
                </div>
              </div>

              {/* MIND WELLNESS METRICS CARD (BENTO SECTION 2 - SPACED WELL TO PREVENT OVERLAPPING)
                  FIXED BUG: Fully reorganized spacing around points and detox hours card so they NEVER overlap by using margin-bottom and full block layouts. */}
              <div className="mt-5 px-4 flex flex-col gap-4">
                
                {/* Score Bar Section */}
                <div className="bg-white p-5 rounded-3xl shadow-md border border-stone-100 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-stone-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                      <Footprints size={12} className="text-[#2a5539]" />
                      마음 웰니스 고요 도보 달성도
                    </span>
                    <div className="text-right">
                      <span className="text-[10.5px] text-stone-400 font-bold block leading-none mb-1">수련 도보 누적거리</span>
                      <span className="text-sm font-extrabold text-[#2a5539]">{walkedKm} <span className="text-[10px] text-stone-400 font-normal">km</span></span>
                    </div>
                  </div>
                  
                  {/* Visual gauge bar */}
                  <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#7ab893] to-[#4a7c59] rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (walkedKm / 10.0) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-[#2a5539] font-bold">
                    <span>현재 수련 도보 거리: {walkedKm} km</span>
                    <span>목표 10.0 km</span>
                  </div>
                </div>

                {/* Grid stats below block comfortable separated padding */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Item 1: Detox time */}
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex flex-col justify-between min-h-[105px]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#e8f5ee] flex items-center justify-center text-[#2a5539]">
                        <Clock size={14} />
                      </div>
                      <span className="text-[10px] text-stone-400 font-bold">오늘 평온시간</span>
                    </div>
                    <div className="text-stone-800 font-extrabold text-base pt-2">
                      {todayMinutes} 분
                      <span className="text-[9px] font-normal text-stone-400 block mt-0.5">하루 목표 60분</span>
                    </div>
                  </div>

                  {/* Item 2: Coupons counts */}
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex flex-col justify-between" onClick={() => { triggerClick(); setActiveTab('profile'); }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                        <Gift size={14} />
                      </div>
                      <span className="text-[10px] text-stone-400 font-bold">보유 로컬쿠폰</span>
                    </div>
                    <div className="text-stone-800 font-extrabold text-base pt-1 hover:underline cursor-pointer">
                      {coupons.filter(c => !c.used).length} 장
                      <span className="text-[9px] font-normal text-[#2a5539] block mt-0.5">사용 대기 무료 🎫</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* 💡 NEW UNIQUE MVP FEATURE 3: NEW INTERACTIVE 3D SPACE-SENSING DEPTH AR CAMERA */}
              <div className="px-4 mt-2">
                <div className="bg-gradient-to-r from-stone-900 to-[#1e2e23] text-stone-100 p-5 rounded-[28px] shadow-lg border border-emerald-950/30 flex flex-col gap-3.5 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-28 h-28 bg-[#2a5539]/30 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex flex-col gap-1 relative z-10">
                    <span className="text-[8.5px] bg-cyan-400/25 text-cyan-200 font-extrabold px-2.5 py-0.5 rounded-full w-fit tracking-wider border border-cyan-400/30 uppercase animate-pulse">
                      ⚡ AR 공간인식 실감카메라
                    </span>
                    <h3 className="text-xs font-black text-white mt-1.5 flex items-center gap-1.5">
                      🌌 횡성 태고의 바람정령 탐화 렌즈
                    </h3>
                    <p className="text-[10px] text-stone-300 leading-normal mt-1">
                      카메라 렌즈를 비춰 주변의 3D 공간을 스캔하세요. 지표면 깊이(Depth)를 나누어 가상의 횡성 웰니스 자연 정령들이 공간 속에 실제로 공중 매핑됩니다.
                    </p>
                  </div>

                  <button 
                    onClick={handleOpenArCamera}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 font-black text-xs text-stone-950 py-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-97 z-10"
                  >
                    <span>🚀 AR 라이다 공간 렌즈 기동</span>
                    <span className="text-[9.5px] bg-stone-950/20 text-stone-950 px-1.5 py-0.5 rounded font-bold">50pt 지급</span>
                  </button>
                </div>
              </div>

              {/* QUICK START TIMER MODULE */}
              <div className="p-4 mt-1">
                <div className="bg-[#FAF9F5] border border-stone-200/80 p-5 rounded-[28px] shadow-sm flex items-center justify-between gap-2.5">
                  <div className="max-w-[200px]">
                    <span className="text-[9px] text-[#2a5539] font-extrabold tracking-widest uppercase">Quick Detox Mode</span>
                    <h3 className="text-sm font-bold text-stone-700 mt-0.5">스마트폰 스톱, 명상 정화 시작</h3>
                    <p className="text-[10px] text-stone-400 leading-normal mt-1">
                      폰을 제쳐두고 가만히 눈을 고요히 감으세요. 정량 에너지 획득의 길.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleStartTimer(25)}
                    className="bg-[#2a5539] hover:bg-[#1c3c26] text-white duration-100 px-4 py-2.5 rounded-xl text-[10.5px] font-bold shadow whitespace-nowrap cursor-pointer active:scale-95"
                  >
                    ⏱️ 바로 시작
                  </button>
                </div>
              </div>

              {/* DAILY INTERACTIVE QUESTS LIST */}
              <div className="px-4 py-1 flex flex-col gap-2.5">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-1.5 animate-pulse-soft">
                    <h3 className="text-xs font-extrabold text-stone-700 tracking-wider">오늘의 평온 수련 미션 LIST</h3>
                    <button 
                      onClick={(e) => { e.stopPropagation(); triggerClick(); handleRefreshQuests(); }}
                      className={`p-1.5 rounded-full text-stone-400 hover:text-[#2a5539] hover:bg-stone-100 transition-all cursor-pointer ${hasRefreshedQuest ? 'opacity-35 cursor-not-allowed' : 'animate-bounce'}`}
                      title={hasRefreshedQuest ? "변경 완료 (일 1회)" : "미션 1회 변경하기 (새로고침)"}
                    >
                      <RefreshCw size={11} className={hasRefreshedQuest ? "" : "" } />
                    </button>
                  </div>
                  <span className="text-[9px] text-[#2a5539] font-medium bg-[#e8f5ee] px-2 py-0.5 rounded-full">일 1회 변경 가능</span>
                </div>

                <div className="flex flex-col gap-2">
                  {dailyQuests.map((quest, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { triggerClick(); setActiveQuest(quest); }}
                      className="bg-white hover:bg-stone-50 transition-all p-3.5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{quest.icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-stone-700 group-hover:text-[#2a5539] duration-100">{quest.name}</h4>
                          <span className="text-[10px] text-stone-400 block mt-0.5">{quest.sub}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[#2a5539] text-[10px] font-bold bg-[#e8f5ee] px-2 py-0.5 rounded-full">
                        <span>+{quest.points}pt</span>
                        <ChevronRight size={10} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MAP (🗺️ 지도 탭) */}
          {activeTab === 'map' && (
            <div className="animate-fade-in p-4 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-bold text-stone-800">횡성 웰니스 명유 테마맵</h2>
                <p className="text-[10px] text-stone-400">지정된 웰니스 경로를 누르시면 아래 자세한 상세 지기가 나타납니다.</p>
              </div>

              {/* REAL INTERACTIVE GEOGRAPHIC MAP */}
              <div 
                ref={mapContainerRef}
                style={{ height: '320px' }}
                className="relative w-full bg-stone-100 border-2 border-stone-200/80 rounded-[32px] overflow-hidden shadow-md z-10"
              />

              <div className="bg-[#e8f5ee] border border-[#cedfd2] rounded-2xl p-3 text-center">
                <span className="text-[10.5px] font-bold text-[#2a5539] flex items-center justify-center gap-1">
                  🌐 가가호호 오프라인 GPS 지도망이 연동되었습니다! 마커를 탭하세요.
                </span>
              </div>

              {/* 🚖 NEW: HOENGSEONG ROMANTIC TAXI INTEGRATION CARD */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 rounded-[28px] p-4.5 shadow-sm flex flex-col gap-2.5 transition-all text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 uppercase text-[50px] font-black font-sans leading-none pointer-events-none select-none text-amber-500/10">
                  TAXI
                </div>
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🚖</span>
                    <div>
                      <h3 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        횡성 낭만택시 스페셜 연계
                        <span className="text-[8.5px] bg-[#1d3d29] text-white font-bold px-1.5 py-0.5 rounded-full">관광지원</span>
                      </h3>
                      <p className="text-[9.5px] text-amber-800 font-bold mt-0.5 leading-snug">
                        대중교통 하차지부터 웰니스 속살 코스까지 가장 쉽고 아늑하게!
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { sounds.playClick(); setIsTaxiInfoExpanded(!isTaxiInfoExpanded); }}
                    className="text-[9.5px] font-bold text-amber-900 bg-amber-200/50 px-2.5 py-1 rounded-xl hover:bg-amber-200 transition-colors cursor-pointer"
                  >
                    {isTaxiInfoExpanded ? '닫기 ✕' : '상세정보 ▾'}
                  </button>
                </div>

                {/* Expanded Section with full details and Action Buttons */}
                {isTaxiInfoExpanded ? (
                  <div className="border-t border-amber-200/50 pt-3 flex flex-col gap-2.5 animate-fade-in text-[10px] text-stone-700">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/30 flex flex-col gap-1.5 leading-relaxed">
                      <div className="flex justify-between items-center text-[9.5px] text-stone-600 font-extrabold pb-1 border-b border-stone-100">
                        <span>💰 관광 지원 파격 혜택 요금</span>
                        <span className="text-[#2a5539]">횡성군 약 70% 지원</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-stone-600">⏱️ 3시간 기본 요금</span>
                        <span className="font-extrabold text-[#2a5539]">단 20,000원 <span className="text-[8.5px] text-stone-400 line-through">70,050원</span></span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-stone-600">⏱️ 5시간 명품 요금</span>
                        <span className="font-extrabold text-[#2a5539]">단 40,000원 <span className="text-[8.5px] text-stone-400 line-through">116,750원</span></span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-100/50 rounded-xl flex flex-col gap-1 text-[9.5px] leading-relaxed text-amber-950 font-medium">
                      <p className="font-bold">✨ 메리트 및 혜택 :</p>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li><strong>자유로운 커스텀 동선:</strong> 내가 직접 짠 안흥찐빵, 정령숲, KTX역 목적지 조합 가능</li>
                        <li><strong>로컬 전문 베테랑 기사님:</strong> 숨겨진 포토존과 맛집 가이드까지 무료 동반</li>
                        <li><strong>짐 보관 &amp; 단체이동:</strong> 친구, 동료 학생들과 4인 가득 차서 엔분의일 최고의 가성비!</li>
                      </ul>
                    </div>

                    <div className="flex gap-1.5 mt-0.5">
                      <a 
                        href="tel:0333405735"
                        onClick={() => { sounds.playClick(); showToast('📞 횡성문화관광재단 서비스 센터 연락처로 연결합니다.'); }}
                        className="flex-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 py-2.5 rounded-xl text-center text-[9px] font-bold flex items-center justify-center gap-1"
                      >
                        ☎️ 유선 문의처 (033-340-5735)
                      </a>
                      <a 
                        href="https://hscf.or.kr/bbs/show_info.php?idx=383"
                        target="_blank" 
                        rel="noreferrer"
                        onClick={() => { sounds.playClick(); showToast('🌐 횡성낭만택시 공식 예약 및 혜택 안내 페이지로 이동합니다.'); }}
                        className="flex-1 bg-[#FEE500] hover:bg-[#ebd300] text-[#3c1e1e] py-2.5 rounded-xl text-center text-[9px] font-black flex items-center justify-center gap-1"
                      >
                        🚖 낭만택시 예약 신청 바로가기
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] text-[#2a5539] flex items-center gap-1 cursor-pointer" onClick={() => { sounds.playClick(); setIsTaxiInfoExpanded(true); }}>
                    <span>💡</span> 3시간 단 2만 원으로 마음껏 누비는 전용 드라이버 서비스. <strong>탭하여 혜택과 연락처 확인</strong>
                  </p>
                )}
              </div>

              {/* MANUAL LIST DISPLAY OF TRAILS TO RE-INFORCE DISCOVERY & INTUITION */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-stone-500 tracking-wide uppercase px-1">코스 선택 수동탐방</h3>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {courses.map((course) => (
                    <div 
                      key={course.id}
                      onClick={() => handleSelectCourseOnMap(course)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        selectedCourse?.id === course.id 
                          ? 'border-[#2a5539] bg-[#e8f5ee]/40 shadow-sm' 
                          : 'border-stone-200/70 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xl">{course.emoji}</span>
                        {course.locked ? (
                          <Lock size={11} className="text-stone-400 mt-0.5" />
                        ) : (
                          <Unlock size={11} className="text-[#2a5539] mt-0.5" />
                        )}
                      </div>
                      <h4 className="text-[10.5px] font-bold text-stone-700 leading-snug tracking-tight mt-1 truncate">{course.name}</h4>
                      <span className="text-[9px] text-stone-400 block mt-0.5">{course.distance} · {course.timeEstimate}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* INTERACTIVE COMPASS BOTTOM DRAWER SLIDE CONTROLLER (As requested: 참이 내려가게/올라가게 해줘) */}
              <div 
                className={`absolute left-0 right-0 bottom-16 w-full bg-[#FAF9F5] border-t border-stone-200 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-[32px] transition-all duration-300 ease-out z-40 overflow-y-auto no-scrollbar ${
                  isBottomSheetOpen && selectedCourse ? 'max-h-[520px] h-[480px] translate-y-0 opacity-100 p-5' : 'max-h-0 translate-y-full opacity-0 p-0 overflow-hidden'
                }`}
              >
                {/* Drawer slider drag handles */}
                <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsBottomSheetOpen(false)}></div>
                
                {selectedCourse && (
                  <div className="flex flex-col gap-3.5 text-stone-700 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl">{selectedCourse.emoji}</span>
                        <div>
                          <h3 className="text-sm font-extrabold text-stone-800 leading-none">{selectedCourse.name}</h3>
                          <span className="text-[9px] text-[#4a7c59] bg-[#e8f5ee] px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                            {selectedCourse.category === 'bread' ? '안흥찐빵 테마' : 
                             selectedCourse.category === 'nature' ? '국립숲체원 테마' : 
                             selectedCourse.category === 'beef' ? '횡성한우 테마' : '태기산 최고산맥'}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => { sounds.playClick(); setIsBottomSheetOpen(false); }}
                        className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-[10.5px] text-stone-400 py-1 border-t border-b border-stone-100/80">
                      <span>도보 거리: <span className="font-bold text-stone-700">{selectedCourse.distance}</span></span>
                      <span>소요 예상: <span className="font-bold text-stone-700">{selectedCourse.timeEstimate}</span></span>
                      <span>보상 포인트: <span className="font-bold text-[#4a7c59]">+{selectedCourse.points}pt</span></span>
                    </div>

                    {/* INTERACTIVE STARS RATING SECTOR (별점 남기기) */}
                    {!selectedCourse.locked && (
                      visitedCourseIds.includes(selectedCourse.id) ? (
                        <div className="bg-white p-2.5 rounded-2xl border border-stone-150 flex items-center justify-between text-left">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-stone-400 font-extrabold uppercase tracking-wide">내 웰니스 만족도 평점</span>
                            <span className="text-[10.5px] font-bold text-stone-750 mt-0.5">이 치유길을 평가해 주세요:</span>
                          </div>
                          <div className="flex gap-1 bg-stone-50 px-2 py-1.5 rounded-xl border border-stone-100">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button 
                                key={star} 
                                onClick={() => { sounds.playClick(); setTempRating(star); showToast(`⭐ 평점을 ${star}점으로 설정했습니다!`); }}
                                className="cursor-pointer text-sm focus:outline-none focus:ring-0 active:scale-12rem transition-transform"
                              >
                                {star <= tempRating ? '⭐️' : '☆'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#fcf8f2] border border-amber-500/15 p-2.5 rounded-2xl text-left text-[9px] text-stone-600 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1 font-extrabold text-amber-800 text-[9.5px]">
                            <span>🔒 평점 남기기 불가</span>
                            <span className="font-normal text-[8.5px] text-stone-400 bg-stone-100 px-1 py-0.2 rounded-md ml-auto">미동반 수련 코스</span>
                          </div>
                          <p className="leading-snug">
                            이 코스는 직접 <strong>걸어서 수련을 완료하셔야</strong> 별점을 남길 수 있습니다.<br />
                            (🥟 안흥찐빵길은 완수하여 열려있지만, 피톤치드길은 아직 방문하지 않아 잠겨 있습니다.)
                          </p>
                          <button
                            onClick={() => {
                              sounds.playSuccess();
                              setVisitedCourseIds(prev => {
                                if (!prev.includes(selectedCourse.id)) {
                                  return [...prev, selectedCourse.id];
                                }
                                return prev;
                              });
                              showToast(`👣 '${selectedCourse.name}' 코스 도장 찍기 완료! 이제 별점과 후기를 적으실 수 있습니다.`);
                            }}
                            className="bg-amber-100 hover:bg-amber-200 border border-amber-500/20 text-amber-900 rounded-lg py-1 font-black text-[8.5px] transition-all cursor-pointer text-center"
                          >
                            🚶 모의 수련 완료 도장 찍기 (방문 완료 처리)
                          </button>
                        </div>
                      )
                    )}

                    {/* LIVE CHATROOM FEED REACTIONS (실시간 나그네 별점/채팅 반응보기) */}
                    {!selectedCourse.locked && (
                      <div className="bg-white p-3 rounded-2xl border border-stone-150 flex flex-col gap-2.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <MessageSquare size={12} className="text-[#2a5539]" />
                            <span className="text-[10.5px] font-extrabold text-[#2a5539]">커뮤니티 반응 &amp; 후기 채팅</span>
                          </div>
                          <span className="text-[8.5px] text-stone-400 font-bold bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                            총 {courseReviews.filter(r => r.courseId === selectedCourse.id).length}개 반응
                          </span>
                        </div>

                        {/* Message list stream */}
                        <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto no-scrollbar border-b border-stone-100 pb-2">
                          {courseReviews.filter(r => r.courseId === selectedCourse.id).map(rev => (
                            <div key={rev.id} className="bg-stone-50/75 p-2 rounded-xl text-left border border-stone-100 text-[10px]">
                              <div className="flex justify-between items-center text-[8.5px] mb-1">
                                <span className="font-extrabold text-stone-700 flex items-center gap-1">
                                  <span>👥</span> {rev.user}
                                </span>
                                <div className="flex gap-1.5 items-center">
                                  <span className="text-amber-500 font-bold">{'★'.repeat(rev.rating)}</span>
                                  <span className="text-stone-400">{rev.time}</span>
                                </div>
                              </div>
                              <p className="text-stone-550 leading-relaxed font-medium">{rev.text}</p>
                            </div>
                          ))}
                        </div>

                        {/* Custom Message input form */}
                        {visitedCourseIds.includes(selectedCourse.id) ? (
                          <div className="flex gap-1.5 mt-0.5">
                            <input 
                              type="text" 
                              placeholder="이 길의 소중한 명상 별점 후기 쓰기..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCourseReview(selectedCourse.id); }}
                              className="flex-1 bg-stone-50 hover:bg-stone-100 focus:bg-white border border-stone-200/90 rounded-xl px-2.5 py-1.5 text-[9.5px] outline-none font-medium placeholder-stone-400 transition-colors"
                            />
                            <button 
                              onClick={() => handleAddCourseReview(selectedCourse.id)}
                              className="bg-[#2a5539] hover:bg-[#1f3f2a] active:scale-95 text-white text-[9.5px] font-extrabold px-3 py-1.5 rounded-xl shrink-0 cursor-pointer transition-transform"
                            >
                              후기달기
                            </button>
                          </div>
                        ) : (
                          <div className="text-[9px] text-[#85532a] bg-[#fcf8f2] border border-amber-500/10 p-2 rounded-xl text-center font-bold">
                            🔒 직접 이 길을 갔다온 후에만 후기 코멘트를 작성하실 수 있습니다.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-1 border-t border-stone-100/70">
                      {selectedCourse.locked ? (
                        <button 
                          onClick={() => handleUnlockCourse(selectedCourse.id)}
                          className="w-full bg-[#4a7c59] text-white py-3 rounded-xl text-xs font-bold shadow hover:bg-[#3f6a4c] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LockKeyhole size={14} />
                          <span>고요력 열쇠로 이 코스 해제하기 (-100pt)</span>
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <a 
                            href={selectedCourse.kakaoLink} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={() => { sounds.playClick(); showToast('🧭 카카오 지도 경로 안내기로 직접 전환합니다.'); }}
                            className="flex-1 bg-[#FEE500] text-[#3c1e1e] py-3 rounded-xl text-center text-[11px] font-bold flex items-center justify-center gap-1"
                          >
                            <span>카카오맵 길찾기 🧭</span>
                          </a>
                          
                          <button 
                            onClick={() => {
                              setActiveCourseId(selectedCourse.id);
                              setSelectedCourse(null);
                              setIsBottomSheetOpen(false);
                              handleStartTimer(selectedCourse.category === 'nature' ? 45 : 30);
                            }}
                            className="flex-1 bg-[#2a5539] text-white py-3 rounded-xl text-[11px] font-bold hover:bg-[#1d3d29] cursor-pointer"
                          >
                            오프라인 디톡스 시작
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: GARDEN (🍀 정령 정원 탭) */}
          {activeTab === 'garden' && (
            <div className="animate-fade-in p-4 flex flex-col gap-3">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-stone-800">고요 정원의 도감사</h2>
                  <p className="text-[10px] text-stone-400">수행으로 만난 정령과 친밀도를 쌓는 가상 정원입니다.</p>
                </div>
                <div className="bg-[#4a7c59]/10 px-2 py-0.5 rounded-full text-[9px] text-[#4a7c59] font-bold">
                  활성: {spirits.filter(s => s.isUnlocked).length} / 8
                </div>
              </div>

              {/* 1. VISUAL PLAYGROUND (진짜 정원 뷰그라운드 - 슬림하게 축소!) */}
              <div 
                className="relative h-44 rounded-[24px] border border-[#4a7c59]/20 bg-cover bg-center overflow-hidden shadow-inner p-2"
                style={{ backgroundImage: "url('https://blog.kakaocdn.net/dna/mmu1g/dJMcafUjmQ4/AAAAAAAAAAAAAAAAAAAAADkMkSe6OnLTQpiitJzcR6ydrlOoUFBdwYBm_Xnel5Dv/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1780239599&allow_ip=&allow_referer=&signature=v52B%2BHTAlphfYhNLOR97hTXZ8FE%3D')" }}
              >
                
                {/* Render unlocked wandering spirits */}
                <div className="absolute inset-0 p-2 flex flex-wrap gap-2 items-center justify-center pointer-events-none">
                  {spirits.filter(s => s.isUnlocked).length === 0 ? (
                    <div className="text-center text-[10px] text-[#3a5d45] font-medium mt-3 leading-relaxed">
                      💤 정원이 조용합니다. 명상을 시작하여 정령을 이곳으로 소환하세요!
                    </div>
                  ) : (
                    spirits.filter(s => s.isUnlocked).map((spirit, idx) => {
                      // Spread them out coordinates - slim version
                      const offsets = [
                        { left: '10%', bottom: '10%' },
                        { left: '42%', bottom: '32%' },
                        { left: '74%', bottom: '12%' },
                        { left: '22%', bottom: '45%' },
                        { left: '58%', bottom: '48%' },
                        { left: '80%', bottom: '40%' },
                        { left: '48%', bottom: '8%' },
                        { left: '5%', bottom: '38%' }
                      ];
                      const pos = offsets[idx % offsets.length];

                      return (
                        <div 
                          key={spirit.id}
                          className="absolute flex flex-col items-center animate-bounce-soft pointer-events-auto cursor-pointer group"
                          style={{ 
                            left: pos.left, 
                            bottom: pos.bottom,
                            animationDelay: `${idx * 0.2}s`
                          }}
                          onClick={() => { sounds.playClick(); setSelectedSpirit(spirit); }}
                        >
                          <div className="relative hover:scale-115 transition-transform duration-250">
                            {spirit.imageUrl ? (
                              <TransparentImage 
                                src={spirit.imageUrl} 
                                alt={spirit.name} 
                                className="w-16 h-16 object-contain drop-shadow-md select-none"
                              />
                            ) : (
                              <span className="text-3xl drop-shadow select-none">{spirit.emoji}</span>
                            )}
                            <span className="absolute -top-1.5 -right-1.5 bg-[#4a7c59] text-white text-[8px] px-1.5 py-0.2 rounded-full font-bold shadow-xs">
                              {spirit.energy}%
                            </span>
                          </div>
                          <span className="bg-white/95 border border-[#4a7c59]/10 font-extrabold text-[8px] px-1 py-0.1 rounded-full text-stone-700 whitespace-nowrap mt-0.5 shadow-xs group-hover:bg-[#e8f5ee]">
                            {spirit.name}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* 2. FEED INVENTORY & QUICK SHOP (사료 보관 가방 및 교환소 - 콤팩트화) */}
              <div className="bg-[#FAF9F5] rounded-2.5xl p-2.5 border border-stone-200/80 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌾</span>
                  <div>
                    <h5 className="text-[10px] font-bold text-stone-700">보유한 참비나무 고급 사료</h5>
                    <p className="text-[11px] font-extrabold text-[#2a5539]">{feedCount} 개</p>
                  </div>
                </div>

                <button 
                  onClick={handleBuyFeed}
                  className="bg-[#2a5539] hover:bg-[#1d3d29] text-white px-2.5 py-1 rounded-lg text-[9.5px] font-extrabold shadow-sm active:scale-95 transition-transform flex items-center gap-1 cursor-pointer"
                >
                  <span>사료 5개 구매 (-100pt)</span>
                  <Trophy size={9} className="text-yellow-400" />
                </button>
              </div>

              {/* 3. INTERACTIVE FEED & PET TARGET CONTROL CONSOLE (슬림하게 압축 + 이모지 캐릭터 아이콘은 완벽 제거!) */}
              <div className="bg-white border border-stone-200/80 p-3 rounded-[24px] shadow-sm flex flex-col items-center gap-2">
                
                {/* Beautiful Large Selected Spirit Portrait */}
                <div className="relative w-24 h-24 rounded-full bg-[#f4faf6] border border-stone-150 flex items-center justify-center shadow-inner group overflow-hidden mt-1">
                  <div className="absolute inset-0 bg-radial-gradient from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {selectedSpirit.isUnlocked ? (
                    selectedSpirit.imageUrl ? (
                      <TransparentImage 
                        src={selectedSpirit.imageUrl} 
                        alt={selectedSpirit.name} 
                        className="w-20 h-20 object-contain select-none animate-bounce-soft"
                      />
                    ) : (
                      <span className="text-5xl select-none animate-bounce-soft">{selectedSpirit.emoji}</span>
                    )
                  ) : (
                    <span className="text-5xl text-stone-300">👤</span>
                  )}
                </div>

                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] bg-amber-500/10 text-amber-600 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {selectedSpirit.isUnlocked ? selectedSpirit.rarity : '비밀 잠금 정령'}
                    </span>
                    <span className="text-xs font-bold text-[#2a5539]">
                      {selectedSpirit.isUnlocked ? selectedSpirit.name : '비밀 정령 (???)'}
                    </span>
                  </div>
                  
                  {selectedSpirit.isUnlocked && selectedSpirit.energy >= 100 && (
                    <span className="text-[9px] bg-red-100 text-red-600 font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                      🎁 보상 수령 대기!
                    </span>
                  )}
                </div>
                
                <p className="text-[9.5px] text-stone-500 text-center leading-relaxed max-w-[280px]">
                  {selectedSpirit.isUnlocked ? selectedSpirit.desc : '🔒 웰니스 수련 또는 QR 스팟 탐방 미션을 완수하여 이 신비를 깨우세요.'}
                </p>

                {/* Energy Indicator bar if unlocked */}
                {selectedSpirit.isUnlocked && (
                  <div className="w-full max-w-[240px] font-semibold text-stone-500">
                    <div className="flex justify-between text-[8px] mb-0.5">
                      <span>호감도 충전율 (기력 HP)</span>
                      <span className="font-bold text-stone-700">{selectedSpirit.energy} / {selectedSpirit.maxEnergy} HP</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          selectedSpirit.energy >= 100 ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-pulse' : 'bg-[#4a7c59]'
                        }`}
                        style={{ width: `${(selectedSpirit.energy / selectedSpirit.maxEnergy) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Handlers console */}
                {selectedSpirit.isUnlocked ? (
                  <div className="flex flex-col gap-1.5 w-full font-extrabold text-[10px]">
                    <div className="w-full">
                      <button 
                        onClick={() => handleFeedSpirit(selectedSpirit.id)}
                        className="w-full bg-[#4a7c59] hover:bg-[#3d6a4c] text-white py-2 rounded-lg transition-all border border-[#4a7c59]/10 cursor-pointer text-center font-extrabold shadow-sm active:scale-98"
                      >
                        🍏 참비나무 고급사료 배배 주기 (+20 HP)
                      </button>
                    </div>

                    {/* Claim Reward Button block context */}
                    {selectedSpirit.energy >= 100 ? (
                      <button 
                        onClick={() => handleClaimSpiritReward(selectedSpirit)}
                        className="w-full bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 text-white font-extrabold text-[10px] py-2 rounded-lg cursor-pointer shadow-md transition-all flex items-center justify-center gap-1 animate-pulse"
                      >
                        <span>💝 {selectedSpirit.name}의 감사 명상쿠폰 받기</span>
                        <ChevronRight size={12} />
                      </button>
                    ) : (
                      <div className="text-[8px] text-stone-400 text-center leading-normal bg-stone-50 py-1 rounded-lg">
                        ⚡ 사료와 호감도를 100 HP까지 모으면 <span className="font-extrabold text-[#4a7c59]">무료혜택 웰니스 쿠폰</span>을 생성해 줍니다!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full bg-stone-50 border border-stone-200/60 p-2.5 rounded-lg flex items-center gap-2">
                    <LockKeyhole size={11} className="text-stone-400 shrink-0" />
                    <p className="text-[8.5px] text-stone-400 leading-normal text-left">
                      잠금 정령은 숲체원 스팟 QR 매핑 또는 고요 누적 포인트를 달성하면 정원에 나타납니다.
                    </p>
                  </div>
                )}
              </div>

              {/* 4. DESIGN ENCYCLOPEDIA / CATALOG (도감이 진짜로 바로 아래에 와서 한눈에 보임!) */}
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[10px] font-bold text-stone-500 tracking-wide uppercase px-1">소중한 정원 정령 도감 목록</h3>
                
                <div className="grid grid-cols-4 gap-1.5">
                  {spirits.map((spirit) => (
                    <div 
                      key={spirit.id}
                      onClick={() => { sounds.playClick(); setSelectedSpirit(spirit); }}
                      className={`p-1.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                        selectedSpirit.id === spirit.id 
                          ? 'border-[#2a5539] bg-[#e8f5ee]/40' 
                          : 'border-stone-200/60 bg-white hover:bg-stone-50'
                      }`}
                    >
                      {spirit.isUnlocked ? (
                        spirit.imageUrl ? (
                          <TransparentImage 
                            src={spirit.imageUrl} 
                            alt={spirit.name} 
                            className="w-12 h-12 object-contain select-none mb-1 shadow-2xs" 
                          />
                        ) : (
                          <span className="text-3xl mb-1">{spirit.emoji}</span>
                        )
                      ) : (
                        <span className="text-3xl mb-1 text-stone-300">👤</span>
                      )}
                      <span className="text-[9px] font-extrabold text-stone-600 mt-0.5 truncate max-w-full text-center">
                        {spirit.isUnlocked ? spirit.name : '???'}
                      </span>
                      {!spirit.isUnlocked ? (
                        <span className="text-[7px] text-orange-500 uppercase mt-0.5 tracking-tight font-bold flex items-center gap-0.4">
                          <Lock size={6} /> Lock
                        </span>
                      ) : (
                        <span className="text-[7px] text-[#2a5539] uppercase mt-0.5 font-bold">
                          {spirit.energy}% HP
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: RECORDS (📚 책갈피 탭) */}
          {activeTab === 'records' && (
            <div className="animate-fade-in p-4 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-bold text-stone-800">고요 서책 수량 전당</h2>
                <p className="text-[10px] text-stone-400">명상 누적 일지, 사색 소리파동, 시크릿 거점들이 기록됩니다.</p>
              </div>

              {/* Sub navbar section for records */}
              <div className="flex gap-1.5 border-b border-stone-200 pb-1 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ranking', name: '🏆 정량랭킹' },
                  { id: 'sounds', name: '🔊 자연의 소리' },
                  { id: 'secrets', name: '🗺️ 시크릿 수색' },
                  { id: 'letters', name: '💌 요정엽서' },
                  { id: 'logs', name: '📖 치유일기' }
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => { sounds.playClick(); setRecordsSubTab(item.id as any); }}
                    className={`px-3 py-1.5 rounded-full text-[10.5px] font-extrabold whitespace-nowrap cursor-pointer transition-all ${
                      recordsSubTab === item.id 
                        ? 'bg-[#2a5539] text-white' 
                        : 'text-stone-400 hover:text-stone-700 bg-stone-100/70'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              {/* SUB TAB content 1: RANKING (디인예왕김용수교수님 1등, 실시간 Firestore 랭킹 전산 반영) */}
              {recordsSubTab === 'ranking' && (() => {
                const myRankIndex = rankings.findIndex(r => r.isMe || r.name.toLowerCase() === username.toLowerCase() || r.name.toLowerCase() === `${username} (나)`.toLowerCase());
                const myRank = myRankIndex !== -1 ? myRankIndex + 1 : rankings.length;
                return (
                  <div className="flex flex-col gap-3">
                    <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-stone-200/55 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[#2a5539] font-bold block">🏆 실시간 랭킹 (누적 치유 포인트 기준)</span>
                        <h4 className="text-xs font-extrabold text-stone-700 mt-1">
                          현재 순위: <span className="text-[#2a5539] text-base font-black underline decoration-2 decoration-emerald-200">{myRank}위</span> ({username || '익명'} 나그네 님)
                        </h4>
                      </div>
                      <span className="bg-[#2a5539] text-white text-[10.5px] font-black px-3 py-1.5 rounded-full shadow-sm">{score} pt</span>
                    </div>

                    <button
                      onClick={() => { triggerClick(); handleSyncWithFirestore(); }}
                      disabled={isSyncing}
                      className="w-full h-10 bg-[#FAF9F5] hover:bg-[#F5F1E5] text-[#2a5539] font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-stone-250 shadow-sm transition-all cursor-pointer active:scale-98"
                    >
                      {isSyncing ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#2a5539]/30 border-t-[#2a5539] animate-spin"></span>
                          <span>Firestore 불러오는 중...</span>
                        </>
                      ) : (
                        <>
                          <span>🔄 실시간 랭킹 서버 동기화</span>
                          <span className="text-[9px] bg-[#2a5539]/10 text-[#2a5539] px-1.5 py-0.5 rounded">마지막: {lastSyncTime}</span>
                        </>
                      )}
                    </button>

                    <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden divide-y divide-stone-100 max-h-80 overflow-y-auto no-scrollbar shadow-sm">
                      {rankings.map((user) => (
                      <div 
                        key={user.rank} 
                        className={`flex justify-between items-center px-4 py-3 text-xs ${
                          user.isMe ? 'bg-[#e8f5ee]/50 font-bold border-l-4 border-l-[#2a5539]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 text-center font-mono font-bold ${
                            user.rank === 1 ? 'text-amber-500 text-sm' : user.rank <= 3 ? 'text-amber-600' : 'text-stone-400'
                          }`}>
                            {user.rank === 1 ? '👑' : user.rank}
                          </span>
                          {(() => {
                            const match = INITIAL_SPIRITS.find(s => s.emoji === user.avatar);
                            if (match && match.imageUrl) {
                              return (
                                <TransparentImage 
                                  src={match.imageUrl} 
                                  alt={match.name} 
                                  className="w-5 h-5 object-contain select-none"
                                />
                              );
                            }
                            return <span className="text-base">{user.avatar}</span>;
                          })()}
                          <span className={`${user.rank === 1 ? 'text-amber-900 font-extrabold' : 'text-stone-700 font-medium'}`}>
                            {user.name}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-stone-600">
                          {user.isMe ? todayMinutes : user.points} 분
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )})()}

              {/* SUB TAB content 2: SOUNDS */}
              {recordsSubTab === 'sounds' && (
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] text-stone-400 leading-normal px-1">
                    아래 소리판 카드를 탭하여 횡성 향토 음향 치유 주파수를 조율하세요.
                  </p>

                  <div className="flex flex-col gap-2.5">
                    {[
                      { icon: '🌲', title: '청태산 삼나무 오케스트라', freq: '피톤치드 백그라운드', type: 'bird', desc: '새벽녘 이새와 딱따구리가 나뭇결을 두드리는 지저귐 주파수' },
                      { icon: '🏞️', title: '주포천 가마가마 개울 흐름소리', freq: '청양 물방울 주파수', type: 'water', desc: '자연 암반 석벽 아래 퐁당 흘러 떨어지는 아침 이슬방울 물거품' },
                      { icon: '🌬️', title: '태기산맥 대자연 치유풍', freq: '단절 이면 정풍 주파수', type: 'wind', desc: '해발 1,200m 바람 발전기 날개가 웅장하게 도는 태고의 고요 바람' }
                    ].map((item, idx) => {
                      const isPlaying = playingAuralIndex === idx;
                      return (
                        <div 
                          key={idx}
                          onClick={() => playCustomAmbientSoundNode(item.type as any, idx)}
                          className={`p-4 rounded-3xl border text-left cursor-pointer transition-all ${
                            isPlaying 
                              ? 'border-[#2a5539] bg-[#e8f5ee]/45 shadow-sm' 
                              : 'border-stone-200/80 bg-white hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{item.icon}</span>
                              <div>
                                <h4 className="text-xs font-bold text-stone-700">{item.title}</h4>
                                <span className="text-[9px] text-[#4a7c59] font-medium">{item.freq}</span>
                              </div>
                            </div>
                            
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isPlaying ? 'bg-[#2a5539] text-white animate-spin' : 'bg-stone-100 text-stone-400'
                            }`}>
                              <Volume2 size={14} />
                            </div>
                          </div>

                          <span className="text-[10px] text-stone-400 block mt-2 leading-relaxed">
                            {item.desc}
                          </span>

                          {isPlaying && (
                            <div className="flex gap-1.5 justify-end mt-2 animate-pulse-soft">
                              <span className="text-emerald-500 font-bold text-[9px]">● LIVE SOUNDWAVE PLAYING</span>
                              <div className="flex gap-0.5 items-end h-3">
                                <div className="w-0.5 bg-emerald-500 h-2 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-0.5 bg-emerald-500 h-3 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                <div className="w-0.5 bg-emerald-500 h-1.5 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                  {playingAuralIndex !== null && (
                    <button 
                      onClick={stopAllAmbientSounds}
                      className="bg-red-50 text-red-600 hover:bg-red-100 py-2.5 rounded-xl text-xs font-bold mt-2 cursor-pointer duration-100 active:scale-95"
                    >
                      모든 사운드 끄기
                    </button>
                  )}

                  {/* PREMIUM MIC RECORDER COMPONENT (자연의 소리 직접 녹음 공간!) */}
                  <div className="bg-[#FAF9F5] border-[1.5px] border-dashed border-stone-250 p-4.5 rounded-[32px] text-left mt-2 shadow-inner">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🎙️</span>
                        <div>
                          <h4 className="text-xs font-extrabold text-stone-800">내 주변 자연의 소리 녹음기</h4>
                          <span className="text-[8.5px] text-[#2a5539] font-bold">마이크를 이용한 고유 사운드 보관</span>
                        </div>
                      </div>
                      <span className="text-[8px] bg-[#2a5539]/10 text-[#2a5539] px-2 py-0.5 rounded-full font-bold">
                        HIGH-RES
                      </span>
                    </div>

                    {!isRecordingSound ? (
                      <button 
                        onClick={startRecordingSound}
                        className="w-full bg-[#2a5539] hover:bg-[#1d3d29] text-white py-3 rounded-2xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 duration-100"
                      >
                        <Mic size={14} className="animate-pulse" />
                        <span>🎙️ 소리 녹음 시작하기</span>
                      </button>
                    ) : (
                      <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex flex-col items-center gap-3 animate-pulse-soft">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                          <span className="text-xs font-black text-red-600">자연 소리 흡음중... ({recordingSeconds}초)</span>
                        </div>

                        {/* Aesthetic voice recording waveform visualizer */}
                        <div className="flex gap-1 items-end justify-center h-10 w-full px-4 border-b border-red-100 pb-2">
                          {[1, 2, 3, 4, 1, 2, 5, 2, 1, 4, 3, 2, 5, 1, 3, 2, 4, 1].map((h, i) => (
                            <div 
                              key={i}
                              className="w-1 bg-red-400 rounded-t-full"
                              style={{ 
                                height: `${Math.random() * 30 + 4}px`,
                                transition: 'height 0.1s ease-in-out'
                              }}
                            ></div>
                          ))}
                        </div>

                        <button 
                          onClick={stopRecordingSound}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-extrabold shadow cursor-pointer text-center"
                        >
                          ⏹️ 녹음 중단 및 수집첩 저장
                        </button>
                      </div>
                    )}

                    {/* Custom recorded sounds list */}
                    <div className="mt-4 border-t border-stone-200/50 pt-3">
                      <h5 className="text-[10px] text-stone-500 font-extrabold uppercase mb-2">마이 수집 음원 수첩 ({recordedSounds.length}장)</h5>
                      
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
                        {recordedSounds.map((sound) => {
                          const isPlayingThis = playingRecordedId === sound.id;
                          return (
                            <div 
                              key={sound.id}
                              className={`flex justify-between items-center p-2.5 rounded-2xl border transition-all ${
                                isPlayingThis ? 'border-amber-400 bg-amber-50/40' : 'border-stone-100 bg-white shadow-xs'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">{isPlayingThis ? '🔊' : '📁'}</span>
                                <div>
                                  <h6 className="text-[10px] font-extrabold text-stone-700 leading-tight">{sound.title}</h6>
                                  <span className="text-[8px] text-stone-400 block mt-0.5">{sound.date} • {sound.duration}</span>
                                </div>
                              </div>

                              <button 
                                onClick={() => togglePlayRecordedSound(sound.id)}
                                className={`px-2.5 py-1 rounded-full text-[8.5px] font-black cursor-pointer transition-all ${
                                  isPlayingThis 
                                    ? 'bg-amber-500 text-white shadow-xs' 
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                                }`}
                              >
                                {isPlayingThis ? '정지' : '듣기'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* SUB TAB content 3: SEEKING SECRET SPOTS (힌트보기 후 큐알찍기가 지원되는 전당!) */}
              {recordsSubTab === 'secrets' && (
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] text-stone-400 leading-normal px-1">
                    관할 횡성 시크릿 거점의 단설지도 힌트를 풀고 실제의 푸르른 현장 풍경을 스캔하여 웰니스 인증 스탬프를 날인하세요.
                  </p>
 
                  <div className="flex flex-col gap-3">
                    {secretSpots.map((spot) => (
                      <div key={spot.id} className="bg-white border border-stone-200/85 p-4 rounded-3xl flex flex-col gap-3 shadow-sm relative overflow-hidden">
                        
                        <div className="flex justify-between items-center pr-14">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📍</span>
                            <div>
                              <h4 className="text-xs font-bold text-stone-700">{spot.title}</h4>
                              <span className={`text-[9px] font-bold ${spot.isRevealed ? 'text-[#2a5539]' : 'text-orange-500'}`}>
                                {spot.isRevealed ? '🟢 풍경인증 완료' : '🔒 수색대기'}
                              </span>
                            </div>
                          </div>
                          
                          {spot.isRevealed ? (
                            <span className="bg-[#e8f5ee] text-[#2a5539] text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                              발견 완료 (+150pt)
                            </span>
                          ) : (
                            <span className="bg-orange-50 text-orange-500 text-[9.5px] px-2 py-0.5 rounded-full font-bold animate-pulse-soft">
                              미답지
                            </span>
                          )}
                        </div>
 
                        {/* Location hint reveal state */}
                        <div className="bg-stone-50 border border-stone-200/50 p-3 rounded-2xl text-[10.5px]">
                          <span className="font-extrabold text-[#4a7c59] block mb-1">🔍 오프라인 힌트서:</span>
                          <p className="text-stone-500 leading-relaxed font-medium">{spot.hint}</p>
                        </div>
 
                        {!spot.isRevealed && (
                          <button 
                            onClick={() => handleOpenScanner(spot)}
                            className="bg-[#2a5539] hover:bg-[#1f3d29] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95 duration-105"
                          >
                            <Camera size={13} />
                            <span>현장 풍경 AI 인식하기 (카메라)</span>
                          </button>
                        )}
 
                        {spot.isRevealed && (
                          <div className="flex flex-col gap-1.5 bg-[#e8f5ee]/40 px-3 py-2.5 rounded-xl text-[10px]">
                            <div className="flex justify-between text-stone-400">
                              <span>인증일자: 2026.05.29</span>
                              <span>고요 AI 매칭률: 99.1%</span>
                            </div>
                            <div className="text-[#2a5539] font-bold text-[9px] flex items-center gap-1">
                              <span>🎁 보상: 신비의 요정 '신비의 솔잎' 육성 기력 +60 HP 지급 완료!</span>
                            </div>
                          </div>
                        )}

                        {/* Visually stunning Korean Wellness Stamp Seal on the card when revealed! */}
                        {spot.isRevealed && (
                          <div className="absolute top-3.5 right-3 w-12 h-12 border-2 border-red-500/70 rounded-full flex flex-col items-center justify-center rotate-12 scale-100 select-none bg-red-500/5 animate-fade-in shadow-xs pointer-events-none">
                            <span className="text-[6.5px] font-black text-red-500/70 tracking-widest leading-none">
                              {spot.id === 's1' ? '숲체원' : spot.id === 's2' ? '호수길' : spot.id === 's3' ? '안흥면' : '태기산'}
                            </span>
                            <span className="text-[9px] font-black text-red-500/95 tracking-wider my-0.5 border-t border-b border-red-500/50 px-0.5 leading-none">
                              확인!
                            </span>
                            <span className="text-[5.5px] font-mono text-red-500/70 leading-none">GOYO</span>
                          </div>
                        )}
 
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB TAB content 4: COMPANION LETTERS (동반 요정들의 보은 비밀 엽서 수집첩) */}
              {recordsSubTab === 'letters' && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  <p className="text-[10px] text-stone-400">명상수행과 먹이주기(사료)를 통해 호감도(기력)가 90 HP 이상 높아진 정령의 엽서와 특전 쿠폰이 여기에 개봉됩니다.</p>
                  
                  <div className="flex flex-col gap-3.5">
                    {letters.map((letter) => {
                      const spiritMatch = spirits.find(s => 
                        letter.writer.includes(s.name) || s.emoji === letter.avatar
                      );
                      // Letters start locked, unlock when spirit.energy >= 90 or fedCount >= 4!
                      const isUnlocked = spiritMatch ? (spiritMatch.energy >= 90 || spiritMatch.fedCount >= 4) : true;

                      if (!isUnlocked && spiritMatch) {
                        return (
                          <div 
                            key={letter.id} 
                            className="bg-gradient-to-br from-[#FAF9F5] to-[#f5f3eb] border-[1.5px] border-dashed border-stone-300 p-5 rounded-[28px] shadow-sm text-center relative overflow-hidden"
                          >
                            <div className="absolute top-2.5 right-3">
                              <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Locked 🔒
                              </span>
                            </div>

                            <span className="text-3xl block filter grayscale select-none animate-pulse-soft">
                              {spiritMatch.imageUrl ? (
                                <TransparentImage 
                                  src={spiritMatch.imageUrl} 
                                  alt={spiritMatch.name} 
                                  className="w-12 h-12 mx-auto object-contain"
                                />
                              ) : (
                                spiritMatch.emoji
                              )}
                            </span>
                            
                            <h4 className="text-xs font-extrabold text-stone-600 mt-2.5">
                              ✉️ {spiritMatch.name}의 숨겨진 보은 엽서
                            </h4>
                            
                            <p className="text-[10px] text-stone-400 leading-relaxed max-w-[260px] mx-auto mt-1.5 font-medium">
                              {spiritMatch.name}에게 정원에서 <span className="text-amber-700 font-extrabold">참비나무 고급 제휴 사료 🌾</span>를 먹여 호감도 90 HP에 달성하면 따뜻한 비밀 편지와 가맹 교환권이 열립니다!
                            </p>

                            {/* Friendship affinity micro progress bar */}
                            <div className="w-full max-w-[200px] mx-auto mt-4.5 mb-2 font-semibold text-stone-500 animate-pulse-soft">
                              <div className="flex justify-between text-[8px] mb-1">
                                <span>호감도 해제 진척도</span>
                                <span className="font-extrabold text-stone-700">{spiritMatch.energy} / 90 HP</span>
                              </div>
                              <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-orange-400 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, (spiritMatch.energy / 90) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            <button
                              onClick={() => { triggerClick(); setActiveTab('garden'); }}
                              className="mt-3.5 bg-[#2a5539] hover:bg-[#1d3d29] text-white text-[9.5px] font-extrabold py-2 px-4 rounded-xl shadow-sm transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>🌾 {spiritMatch.name}에게 밥 주러 정원 가기</span>
                              <ChevronRight size={10} />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div key={letter.id} className="bg-white border border-stone-200 p-4 rounded-[28px] shadow-sm text-left relative overflow-hidden transition-all duration-300">
                          {/* Opened shiny ribbon stamp */}
                          <div className="absolute -top-1 -right-1.5 w-10 h-10 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center text-white text-[9px] font-black uppercase rotate-12 scale-75 select-none shadow-sm shadow-yellow-800/10 border border-amber-400">
                            OPENED
                          </div>

                          <div className="flex justify-between items-center border-b border-stone-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const match = INITIAL_SPIRITS.find(s => 
                                  letter.writer.includes(s.name) || s.emoji === letter.avatar
                                );
                                if (match && match.imageUrl) {
                                  return (
                                    <TransparentImage 
                                      src={match.imageUrl} 
                                      alt={match.name} 
                                      className="w-9 h-9 object-contain select-none"
                                    />
                                  );
                                }
                                return <span className="text-2xl">{letter.avatar}</span>;
                              })()}
                              <div>
                                <h4 className="text-xs font-bold text-stone-700">{letter.writer}</h4>
                                <p className="text-[10px] font-extrabold text-[#4a7c59]">{letter.title}</p>
                              </div>
                            </div>
                            <span className="text-[8.5px] text-stone-300 font-semibold">{spiritMatch ? `${spiritMatch.fedCount}회 냠냠 🧡` : letter.date}</span>
                          </div>
                          <p className="text-stone-500 text-[10.5px] leading-relaxed mt-2.5 bg-yellow-50/20 p-3 rounded-2xl border border-yellow-200/10 font-medium whitespace-pre-line font-serif">
                            {letter.content}
                          </p>
                          
                          {/* Display associated coupon beneath the letter! */}
                          {letter.associatedCoupon && (
                            <div className="mt-3 bg-[#e8f5ee]/45 border border-[#4a7c59]/15 rounded-2xl p-2.5 flex items-center justify-between text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-base text-amber-500 animate-bounce">🎟️</span>
                                <div>
                                  <h5 className="text-[8px] text-[#4a7c59] font-extrabold tracking-tight uppercase">발급 동반 쿠폰</h5>
                                  <p className="text-[10.5px] font-extrabold text-[#2a5539]">{letter.associatedCoupon}</p>
                                </div>
                              </div>
                              <span className="text-[8px] bg-[#2a5539] text-white font-bold py-0.5 px-2 rounded-full shadow-xs shrink-0 scale-90">
                                쿠폰함 적립완료
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB TAB content 5: WRITTEN DIARY LOGS */}
              {recordsSubTab === 'logs' && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[10.5px] text-stone-400">명유 탐방 완료 후 수기로 작성해 끼워둔 마음 책갈피첩.</p>
                    <button 
                      onClick={() => { triggerClick(); setShowNewLogModal(true); }}
                      className="bg-[#2a5539] hover:bg-emerald-900 border border-emerald-950 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow"
                    >
                      + 일지 쓰기
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {logs.map((log) => (
                      <div key={log.id} className="bg-[#fbfcfa] border border-stone-200/80 p-4 rounded-3xl text-left shadow-sm">
                        <div className="flex justify-between items-center text-[10px] border-b border-stone-150 pb-2 mb-2">
                          <span className="text-[#4a7c59] font-extrabold flex items-center gap-1">
                            <Footprints size={11} />
                            {log.course}
                          </span>
                          <span className="text-stone-400">{log.date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-stone-700">{log.title}</h4>
                        <p className="text-[10.5px] text-stone-500 italic leading-relaxed py-2 bg-stone-50 px-2 rounded-xl mt-1.5 border border-stone-200/20">
                          {log.quote}
                        </p>
                        
                        <div className="flex justify-between mt-2 text-[9px] text-stone-400">
                          <span>⏱️ 디톡스소요: {log.duration}</span>
                          <div className="flex gap-1.5">
                            {log.tags.map(t => (
                              <span key={t} className="bg-[#FAF9F5] border border-stone-200 px-1.5 py-0.5 rounded text-stone-600">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: PROFILE/MY PAGE (🧘 내 정보 탭 - HOLDS COUPONS AND ACTIVE LOGOUT) */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in p-4 flex flex-col gap-4">
              
              <div className="bg-white border border-stone-250 p-5 rounded-[32px] flex flex-col items-center shadow-sm relative">
                <span className="text-[10px] bg-[#2a5539]/10 text-[#2a5539] font-bold px-3 py-0.5 rounded-full">
                  횡성 웰니스 등록증
                </span>

                <div className="w-16 h-16 rounded-full bg-[#f1fcf4] flex items-center justify-center text-3xl shadow-inner border border-stone-100 my-3">
                  {userAvatar}
                </div>

                <h3 className="text-sm font-bold text-stone-700">{username || '공주'} 님</h3>
                <p className="text-[10.5px] text-stone-400 mt-1">도보 가칭 VIP 등급 (새싹 잎)</p>

                <div className="flex flex-col items-center gap-1.5 mt-2">
                  <button
                    onClick={() => {
                      triggerClick();
                      setProfileEditNickname(username);
                      setProfileEditAvatar(userAvatar);
                      setIsProfileModalOpen(true);
                    }}
                    className="px-4 py-1.5 bg-[#2a5539]/10 hover:bg-[#2a5539]/20 text-[#2a5539] rounded-full text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    ⚙️ 프로필 편집 & 랭킹 동기화
                  </button>

                  <div className="text-[8.5px] text-stone-400 font-mono flex items-center gap-1 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/50">
                    <span className={`w-1 h-1 rounded-full ${isSyncing ? 'bg-amber-400 animate-spin' : 'bg-emerald-500'}`}></span>
                    <span>클라우드 동기화: {lastSyncTime}</span>
                  </div>
                </div>

                <div className="w-full h-px bg-stone-100 my-3"></div>

                <div className="grid grid-cols-2 gap-3.5 w-full text-center text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold">누적 마일리지</span>
                    <span className="font-extrabold text-stone-700 mt-0.5 block">{score} pt</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold">도감 요정수</span>
                    <span className="font-extrabold text-[#2a5539] mt-0.5 block">4마리 / 8종</span>
                  </div>
                </div>
              </div>

              {/* LOCALLY DISCOVERED REAL VITAL COUPONS CONTAINER */}
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold text-stone-500 tracking-wide uppercase">🎫 내 횡품 상생 쿠폰함</h3>
                  <span className="text-[8.5px] text-stone-400">만료일 3개월 고정</span>
                </div>

                {coupons.length === 0 ? (
                  <div className="bg-stone-50 border border-stone-200/50 p-6 rounded-2xl text-center text-xs text-stone-400">
                    <p>현재 보유 사용가능한 쿠폰이 비어 있습니다.</p>
                    <p className="text-[10px] text-stone-300 mt-1">정원에서 정령들을 씩씩하게 키워 방생해 보세요!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {coupons.map((coupon) => (
                      <div 
                        key={coupon.id} 
                        className={`border rounded-2xl p-4 text-left transition-all relative overflow-hidden flex flex-col gap-2.5 shadow-sm ${
                          coupon.used 
                            ? 'border-stone-200 bg-stone-100/60 opacity-65 grayscale' 
                            : 'border-orange-200/70 bg-white'
                        }`}
                      >
                        {/* Stamp Overlay decoration if used */}
                        {coupon.used && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-4 border-red-500/80 rounded-full flex items-center justify-center text-red-500/80 font-black text-sm uppercase select-none pointer-events-none rotate-12 bg-white/40 z-20">
                            USED 사용완료
                          </div>
                        )}

                        <div className="flex justify-between items-start gap-1">
                          <div>
                            <span className="text-[9px] text-[#4a7c59] bg-[#e8f5ee] px-2 py-0.5 rounded-full font-extrabold block w-fit mb-1">
                              {coupon.provider}
                            </span>
                            <h4 className="text-xs font-extrabold text-stone-800 tracking-tight leading-snug">{coupon.title}</h4>
                            <span className="text-[11px] text-amber-600 font-extrabold block mt-0.5">{coupon.discount}</span>
                          </div>
                          <span className="text-2xl mt-0.5">🎫</span>
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-stone-400/90 pt-2 border-t border-stone-100">
                          <span>만료일자: {coupon.expireDate} 까지</span>
                          <span className="font-mono text-stone-500">코드: {coupon.code}</span>
                        </div>

                        {!coupon.used && (
                          <button 
                            onClick={() => handleOpenStampVerification(coupon)}
                            className="bg-[#2a5539] hover:bg-[#1f3f2a] text-white py-2 rounded-xl text-xs font-bold tracking-wide mt-1.5 shadow-sm cursor-pointer"
                          >
                            사용하기 (직원인증)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LOGOUT BUTTONS LIST */}
              <div className="flex gap-2 text-xs font-bold mt-4">
                <button 
                  onClick={() => {
                    sounds.playSuccess();
                    const resetObj: Coupon[] = [{
                      id: 'welcome_1',
                      title: '🌱 고요로 웰니스 웰컴 드링크 교환권',
                      provider: '카페 고요 (수변숲길점)',
                      discount: '들꽃 시그니처 티 1잔 무료 제공',
                      expireDate: '2026.09.30',
                      used: false,
                      code: 'GOYOWELCOME99'
                    }];
                    saveCouponsToLocal(resetObj);
                    setScore(100);
                    localStorage.setItem('goyo_user_score', '100');
                    setWalkedKm(1.2);
                    localStorage.setItem('goyo_walked_km', '1.2');
                    setSecretSpots(INITIAL_SECRET_SPOTS);
                    localStorage.setItem('goyo_secret_spots', JSON.stringify(INITIAL_SECRET_SPOTS));
                    showToast('🔄 모든 마음 웰니스 마일리지가 100pt로 초기화되었습니다.');
                  }}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-500 py-3 rounded-xl border border-stone-200"
                >
                  데이터 초기화
                </button>

                <button 
                  onClick={handleLogout}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>로그아웃</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* TAB BOTTOM BAR NAVIGATOR (5 TABS) */}
        {/* ========================================================= */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#2a5539] border-t border-stone-200/50 flex justify-around items-center z-30 select-none">
          {[
            { id: 'home', icon: Home, label: '고요홈' },
            { id: 'map', icon: MapIcon, label: '치유맵' },
            { id: 'garden', icon: Sprout, label: '정원요정' },
            { id: 'records', icon: BookOpen, label: '책갈피' },
            { id: 'profile', icon: User, label: '마이홈' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComponent = tab.icon;
            
            return (
              <button 
                key={tab.id}
                onClick={() => { triggerClick(); setActiveTab(tab.id as any); }}
                className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-all ${
                  isActive ? 'text-[#FAF9F5] scale-110' : 'text-[#a0cca4] hover:text-[#e8f5ee]'
                }`}
              >
                <IconComponent size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
                <span className="text-[9.5px] font-extrabold mt-1 tracking-tight select-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* DAILY QUEST MODAL */}
        {activeQuest && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-[#FAF9F5] text-stone-700 w-full max-w-[320px] rounded-[32px] p-5.5 shadow-2xl border border-stone-300">
              
              <div className="text-center">
                <span className="text-4xl">{activeQuest.icon}</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a7c59] mt-3">Daily Quest</h3>
                <h2 className="text-base font-extrabold text-stone-800 leading-snug mt-1">{activeQuest.name}</h2>
                <p className="text-[11px] text-stone-500 leading-relaxed mt-2.5 bg-[#f3efe4] p-3 rounded-2xl text-left border border-stone-200/10">
                  {activeQuest.desc}
                </p>
              </div>

              <div className="flex justify-between items-center bg-white/60 p-3 rounded-2xl mt-4 border border-stone-200 text-[10.5px]">
                <span className="text-stone-400 font-bold">보답 어워드:</span>
                <span className="font-extrabold text-[#4a7c59]">+{activeQuest.points}pt / {activeQuest.reward}</span>
              </div>

              <div className="flex gap-2 mt-4 text-xs font-extrabold">
                <button 
                  onClick={() => {
                    const q = activeQuest;
                    setActiveQuest(null);
                    // trigger associated tabs for streamlined experience
                    if (q.icon === '🥟') {
                      setActiveTab('records');
                      setRecordsSubTab('secrets');
                      showToast('🗺️ 시크릿 거점 수색 전당으로 이동했습니다. 힌트를 읽고 QR코드를 찾아 찍어보세요.');
                    } else if (q.icon === '🌲') {
                      setActiveTab('records');
                      setRecordsSubTab('sounds');
                      showToast('🔊 오케스트라 사운드를 켜고 자연 치유파동에 채널을 조율하십시오.');
                    } else {
                      handleStartTimer(25);
                    }
                  }}
                  className="flex-1 bg-[#2a5539] text-white py-3 rounded-xl cursor-pointer shadow hover:bg-[#1a3c26]"
                >
                  수행 개시 🚶
                </button>
                <button 
                  onClick={() => { triggerClick(); setActiveQuest(null); }}
                  className="flex-1 bg-stone-100 text-stone-500 border border-stone-200 py-3 rounded-xl cursor-pointer"
                >
                  닫기
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MASTER DIALOG MODAL FOR JOURNAL LOG CREATOR */}
        {showNewLogModal && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <form onSubmit={handleAddNewJournalLog} className="bg-[#FAF9F5] text-stone-700 w-full max-w-[340px] rounded-[32px] p-5.5 shadow-2xl border border-stone-200 flex flex-col gap-3.5 animate-scale-up">
              
              <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                <h3 className="text-sm font-extrabold text-stone-800">📝 명유 고요 일지 수첩 쓰기</h3>
                <button 
                  type="button"
                  onClick={() => { triggerClick(); setShowNewLogModal(false); }}
                  className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-stone-400 font-bold uppercase">코스 대입</label>
                <select 
                  value={newLogCourse}
                  onChange={(e) => setNewLogCourse(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 outline-none"
                >
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-stone-400 font-bold uppercase">사색 일지 제목</label>
                <input 
                  type="text"
                  value={newLogTitle}
                  onChange={(e) => setNewLogTitle(e.target.value)}
                  placeholder="예: 바람 산마루에서 텅 빈 가슴을 마주하며"
                  className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-700 outline-none focus:border-[#2a5539]"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] text-stone-400 font-bold uppercase">소박한 명유 치유 소감</label>
                <textarea 
                  rows={3}
                  value={newLogQuote}
                  onChange={(e) => setNewLogQuote(e.target.value)}
                  placeholder="디지털 전원을 끄고 산새 소리를 한참 들었을 때 몰려들던 청아한 마음을 기재해 보세요..."
                  className="bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-700 outline-none focus:border-[#2a5539] resize-none leading-relaxed"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[10px] text-stone-400 font-bold uppercase">걷기 소요 시간</label>
                  <input 
                    type="text" 
                    value={newLogTime} 
                    onChange={(e) => setNewLogTime(e.target.value)}
                    className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#2a5539]"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#2a5539] hover:bg-emerald-950 font-bold text-white text-xs py-3 rounded-xl mt-2 cursor-pointer shadow-md"
              >
                사색 일지 책갈피에 등록 (+50pt)
              </button>

            </form>
          </div>
        )}

        {/* QUEST PROMPT MODAL WHEN POINTS ARE INSUFFICIENT OR USED UP */}
        {showQuestPromptModal && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-[#FAF9F5] text-stone-700 w-full max-w-[320px] rounded-[32px] p-5.5 shadow-2xl border border-stone-300 animate-scale-up relative">
              <button 
                type="button"
                onClick={() => { triggerClick(); setShowQuestPromptModal(false); }}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <div className="text-center mt-2">
                <span className="text-5xl animate-bounce inline-block">🌱</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2a5539] mt-3">포인트 부족 알림</h3>
                <h2 className="text-sm font-extrabold text-stone-800 leading-snug mt-1">고요 포인트가 바닥났어요!</h2>
                <p className="text-[11px] text-stone-500 leading-relaxed mt-2.5 bg-[#f3efe4] p-3 rounded-2xl text-left border border-stone-200/5 select-text">
                  현재 보유하신 고요 포인트가 부족하거나 다 쓰셨습니다. 
                  사색 웰니스의 다양한 **보너스 퀘스트**나 **디톡스 숨숨 모드**를 완수하면 포인트를 듬뿍 재충전할 수 있습니다!
                </p>
              </div>

               <div className="my-4 border-t border-stone-200 pt-3 flex flex-col gap-2">
                <div 
                  onClick={() => { triggerClick(); setShowQuestPromptModal(false); setActiveTab('home'); }} 
                  className="bg-[#2a5539]/5 hover:bg-[#2a5539]/10 p-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all border border-[#2a5539]/10"
                >
                  <span className="text-lg">⏱️</span>
                  <div className="text-left w-full">
                    <p className="text-[10px] font-extrabold text-stone-800 leading-tight">디톡스 명상 25분 완주하기</p>
                    <p className="text-[9px] text-[#2a5539] font-bold">+150pt 즉시 수급</p>
                  </div>
                </div>

                <div 
                  onClick={() => { triggerClick(); setShowQuestPromptModal(false); setActiveTab('records'); setRecordsSubTab('sounds'); }} 
                  className="bg-[#2a5539]/5 hover:bg-[#2a5539]/10 p-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all border border-[#2a5539]/10"
                >
                  <span className="text-lg">🏕️</span>
                  <div className="text-left w-full">
                    <p className="text-[10px] font-extrabold text-stone-800 leading-tight">자연 치유 소리파동 듣기</p>
                    <p className="text-[9px] text-[#2a5539] font-bold">+40pt ~ +150pt 듬뿍 획득</p>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => { triggerClick(); setShowQuestPromptModal(false); setActiveTab('home'); }}
                className="w-full bg-[#2a5539] hover:bg-[#1f3f2a] text-white py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer text-center mt-1"
              >
                🌾 퀘스트 해결하러 가기!
              </button>
            </div>
          </div>
        )}

        {/* PROFILE EDIT MODAL WITH FIRESTORE AUTO-SYNC */}
        {isProfileModalOpen && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
            <div className="bg-[#FAF9F5] text-stone-700 w-full max-w-[340px] rounded-[32px] p-6 shadow-2xl border border-stone-200 animate-scale-up relative">
              <button 
                type="button"
                onClick={() => { triggerClick(); setIsProfileModalOpen(false); }}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-5">
                <span className="text-sm font-bold text-[#2a5539] uppercase tracking-wide">⚙️ 프로필 편집</span>
                <h2 className="text-base font-extrabold text-stone-800 mt-1">나그네 프로필 및 아바타 설정</h2>
                <p className="text-[10px] text-stone-400 mt-1">클라우드와 연결되어 실시간 랭킹에 즉시 보정 반영됩니다.</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Nickname Input */}
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[9.5px] text-[#2a5539] font-black uppercase">대행 명칭 (닉네임)</label>
                  <input 
                    type="text"
                    value={profileEditNickname}
                    onChange={(e) => setProfileEditNickname(e.target.value)}
                    className="bg-white border border-stone-250 rounded-xl px-3 py-2.5 text-xs text-stone-700 font-extrabold outline-none focus:border-[#2a5539] transition-all"
                    placeholder="변경할 닉네임을 기입하세요"
                    maxLength={15}
                  />
                </div>

                {/* Avatar Selector (Emojis representing available entities/personalities) */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9.5px] text-[#2a5539] font-black uppercase">나그네 대표 아바타 선택</label>
                  <div className="grid grid-cols-6 gap-2 bg-white border border-stone-250 rounded-2xl p-2.5 max-h-24 overflow-y-auto no-scrollbar">
                    {['🧘', '🧚', '🤠', '🧝', '👴', '👵', '🦦', '🐮', '💧', '🌲', '🥟', '👑', '🌈', '🔥'].map((emoji) => {
                      const isSelected = profileEditAvatar === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => { triggerClick(); setProfileEditAvatar(emoji); }}
                          className={`text-xl p-1.5 rounded-xl cursor-pointer transition-all hover:scale-110 h-10 w-10 flex items-center justify-center ${
                            isSelected ? 'bg-[#2a5539]/15 border-2 border-[#2a5539] scale-110 shadow-inner' : 'bg-stone-50 border border-stone-150'
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-2">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={async () => {
                      triggerClick();
                      if (!profileEditNickname) {
                        showToast('⚠️ 닉네임을 빈칸으로 둘 수 없습니다.');
                        return;
                      }
                      
                      // Update local state
                      setUsername(profileEditNickname);
                      setUserAvatar(profileEditAvatar);
                      localStorage.setItem('goyo_logged_user', profileEditNickname);
                      localStorage.setItem('goyo_user_avatar', profileEditAvatar);

                      // Trigger firestore sync immediately
                      await handleSyncWithFirestore(profileEditNickname, profileEditAvatar);
                      
                      setIsProfileModalOpen(false);
                      showToast('✅ 프로필이 완료되어 Firestore와 안전하게 연동 보정되었습니다!');
                    }}
                    className="w-full bg-[#2a5539] hover:bg-[#1f3f2a] disabled:bg-stone-300 text-white py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer text-center"
                  >
                    {isSyncing ? 'Firestore에 저장 중...' : '💾 프로필 저장 & 랭킹 동기화하기'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { triggerClick(); setIsProfileModalOpen(false); }}
                    className="w-full bg-stone-150 hover:bg-stone-200 text-stone-500 py-2.5 rounded-xl text-xs font-bold cursor-pointer text-center"
                  >
                    취소
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* AR CO-ORDINATE DETECTING SPACE LENS OVERLAY MODAL */}
        {isArCameraOpen && (
          <div className="absolute inset-0 bg-[#0c0f0d] text-white flex flex-col justify-between p-5 z-55 overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
                <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest">3D Lidar Spatial Depth Lens</span>
              </div>
              <button 
                onClick={handleCloseArCamera}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Subtitles with distance guide */}
            <div className="text-center my-3 shrink-0">
              <span className="text-[9px] bg-cyan-950/80 text-cyan-300 px-2.5 py-0.5 rounded font-black tracking-wider border border-cyan-500/30">
                공간 탐지 각도: 120° 와이드 뷰
              </span>
              <h2 className="text-sm font-black text-white mt-1.5">🌌 횡성 바람 요정 깊이 분할 구출 Lens</h2>
              <p className="text-[10px] text-white/50 mt-1 px-4">
                바람발전기 및 잣나무 언덕의 3D 공간을 인식 중입니다. 화면을 탭하면 라이다 펄스를 쏘아 거리를 측정(Depth Map)하며, 숨은 요정을 방생 구출할 수 있습니다!
              </p>
            </div>

            {/* Native Camera View with AR Overlayers */}
            <div className="relative aspect-[4/3] w-full bg-black rounded-3xl border border-white/15 overflow-hidden shadow-2xl flex-1 max-h-[360px] flex items-center justify-center group">
              
              {/* Live Video component */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* 3D Wireframe Overlay Line Matrix to look intensely high-quality AR */}
              <div className="absolute inset-0 border border-cyan-500/10 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-40">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-cyan-500/20 relative">
                    <div className="absolute top-0 left-0 w-1 p-px bg-cyan-400/40"></div>
                  </div>
                ))}
              </div>

              {/* Concentric Depth Circles centering user's focus */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full border border-cyan-500/30 animate-pulse flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 opacity-70"></div>
                </div>
              </div>

              {/* Interactive laser-pointing locator */}
              <div 
                className="absolute inset-0 cursor-crosshair"
                onClick={(e) => {
                  triggerClick();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                  const clickY = ((e.clientY - rect.top) / rect.height) * 100;
                  // Calculate arbitrary depth metric between 0.3m and 3.0m
                  const randomDepth = +(0.3 + (clickY / 30)).toFixed(2);
                  setArDepthTarget({ x: clickX, y: clickY, z: randomDepth });
                  sounds.playClick();
                }}
              >
                {/* Visual click target representing actual 3D Lidar point */}
                {arDepthTarget && (
                  <div 
                    style={{ left: `${arDepthTarget.x}%`, top: `${arDepthTarget.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10"
                  >
                    <div className="w-6 h-6 rounded-full border-2 border-cyan-400 animate-ping absolute"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 z-10"></div>
                    <span className="bg-cyan-900 border border-cyan-400/60 text-[8.5px] font-mono text-cyan-200 px-1.5 py-0.5 rounded shadow mt-1.5 block whitespace-nowrap">
                      🚩 레이저 펄스: {arDepthTarget.z}m (Depth)
                    </span>
                  </div>
                )}

                {/* Floating spirits to capture */}
                {arTargetSpirits.map((spirit) => (
                  <div
                    key={spirit.id}
                    style={{ left: `${spirit.x}%`, top: `${spirit.y}%` }}
                    onClick={(e) => {
                      e.stopPropagation(); // prevent overlapping surface coordinates clicks
                      handleCaptureArSpirit(spirit);
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer hover:scale-125 transition-all z-20 group anim-float"
                  >
                    {/* Pulsing Aura halo */}
                    <div 
                      style={{ borderColor: spirit.color }}
                      className="w-12 h-12 rounded-full border-2 border-dashed absolute animate-[spin_5s_linear_infinite] opacity-60"
                    ></div>
                    <div className="text-3xl animate-[bounce_1.5s_infinite] select-none">
                      {spirit.emoji}
                    </div>
                    
                    <span className="bg-[#1c241e] border border-white/20 text-[8px] font-extrabold px-2 py-0.5 rounded shadow mt-1 block tracking-tight whitespace-nowrap text-white">
                      {spirit.name} (거리: {spirit.z}m)
                    </span>
                  </div>
                ))}

              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2 mt-4 shrink-0">
              <div className="flex justify-between items-center text-stone-400 text-[10px] bg-white/5 p-2 rounded-xl border border-white/10 px-3">
                <span>남은 공간 증강요정: <span className="font-bold text-cyan-400 font-mono">{arTargetSpirits.length}마리</span></span>
                <span>LiDAR 센서 피드: <span className="font-bold text-[#7ab893]">정상 작동 중</span></span>
              </div>
              
              <button
                onClick={handleCloseArCamera}
                className="w-full bg-[#2a5539] hover:bg-[#1f3f2a] text-white py-3 rounded-2xl text-xs font-bold tracking-wide shadow-md cursor-pointer"
              >
                스페이스 렌즈 닫기 (이완 완료)
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
