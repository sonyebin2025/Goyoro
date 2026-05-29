/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Core Data Structures for GOYO-RO Wellness Applet

export type SpiritRarity = 'RARE' | 'UNCOMMON' | 'COMMON';

export interface Spirit {
  id: string;
  name: string;
  emoji: string;
  rarity: SpiritRarity;
  desc: string;
  energy: number;
  maxEnergy: number;
  fedCount: number;
  petCount: number;
  isUnlocked: boolean;
  imageUrl?: string;
}

export interface Coupon {
  id: string;
  title: string;
  provider: string;
  discount: string;
  expireDate: string;
  used: boolean;
  code: string;
}

export interface Course {
  id: string;
  name: string;
  category: 'all' | 'bread' | 'nature' | 'beef' | 'zen';
  emoji: string;
  distance: string;
  timeEstimate: string;
  points: number;
  tags: string[];
  locked: boolean;
  info: string;
  guideMapPoints: { name: string; x: number; y: number; detail: string }[];
  kakaoLink: string;
}

export interface RankingUser {
  rank: number;
  name: string;
  points: number;
  isMe?: boolean;
  avatar: string;
}

export interface SecretSpot {
  id: string;
  title: string;
  hint: string;
  isRevealed: boolean;
  location: string;
  qrUrlValue: string; // The specific simulation QR data needed to unlock
}

export interface SpiritLetter {
  id: string;
  writer: string;
  avatar: string;
  title: string;
  content: string;
  date: string;
  associatedCoupon?: string;
}

export interface JournalLog {
  id: string;
  date: string;
  course: string;
  title: string;
  quote: string;
  tags: string[];
  duration: string;
}

// Initial seed spirits matching custom requirements:
// 1. 도도 (물방울) - 💧
// 2. 방구 (황소) - 🐮
// 3. 먹과 구름이 (안개구름솜 세트) - ☁️🐈
// 4. 달달이 (수달) - 🦦
// + 4 locked secret silhouette characters
export const INITIAL_SPIRITS: Spirit[] = [
  {
    id: 'jjin',
    name: '찐',
    emoji: '🥟',
    rarity: 'COMMON',
    desc: '안흥 가마솥 따뜻한 스팀 속에서 피어올라 모락모락 은은한 팥소 향이 도는 사랑스러운 찐빵 정령.',
    energy: 85,
    maxEnergy: 100,
    fedCount: 2,
    petCount: 5,
    isUnlocked: true,
    imageUrl: 'https://blog.kakaocdn.net/dna/bJVIxh/dJMcadhSWiP/AAAAAAAAAAAAAAAAAAAAABbOphc1ddrkTDYhP7eGM8N2Eg2P6NbMYP9kyeMH_NY6/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1780239599&allow_ip=&allow_referer=&signature=G%2BalthqQtvGk8DysUlvYJTW58e4%3D',
  },
  {
    id: 'dodo',
    name: '도도',
    emoji: '💧',
    rarity: 'COMMON',
    desc: '청태산 아침 이슬 속 맑고 촉촉한 기운을 가득 모아 깨어난 물방울 정령.',
    energy: 65,
    maxEnergy: 100,
    fedCount: 3,
    petCount: 6,
    isUnlocked: true,
    imageUrl: 'https://blog.kakaocdn.net/dna/Oze75/dJMcacXyxB7/AAAAAAAAAAAAAAAAAAAAAJXuyqKE1GB0HMRIJ8UxS9r2M7HGvF_oxIFJOJW3Unzu/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1780239599&allow_ip=&allow_referer=&signature=ZPg2yucKDNIAqll6uTVkiG53uOM%3D',
  },
  {
    id: 'banggu',
    name: '방구',
    emoji: '🐮',
    rarity: 'RARE',
    desc: '횡성 한우의 묵직하고 평화로운 기운을 은은하게 내뿜는 우직한 아기 황소 정령.',
    energy: 80,
    maxEnergy: 100,
    fedCount: 2,
    petCount: 9,
    isUnlocked: true,
    imageUrl: 'https://blog.kakaocdn.net/dna/44QQA/dJMcadhSWiQ/AAAAAAAAAAAAAAAAAAAAAFbf1wNxDoCJnJff6rVZmyoErvH1Zm8b7q3XE8odtMvy/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1780239599&allow_ip=&allow_referer=&signature=ZGIsVEGfH0yraBtErOF9%2BsPUyaU%3D',
  },
  {
    id: 'daldalyi',
    name: '달달이',
    emoji: '🦦',
    rarity: 'UNCOMMON',
    desc: '섬강 줄기 은색 물살에서 노니는 조갯돌 사랑둥이 아기 귀요미 수달 정령이자 횡성의 자랑.',
    energy: 70,
    maxEnergy: 100,
    fedCount: 4,
    petCount: 4,
    isUnlocked: true,
    imageUrl: 'https://blog.kakaocdn.net/dna/k5ylc/dJMcacXyxB6/AAAAAAAAAAAAAAAAAAAAAF8Km6-inIALkkVVGM1G0WoGCs_AyNV-hC9RkwctANhY/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1780239599&allow_ip=&allow_referer=&signature=3uX0xckgA9iwWvEtzZ4ASOOv0y8%3D',
  },
  {
    id: 'meok_gureum',
    name: '먹과 구름이',
    emoji: '☁️🐈',
    rarity: 'COMMON',
    desc: '태기산 안개와 신선한 바람결 사이에서 깃든 장난꾸러기 검둥이 먹이와 가벼운 아기 솜구름 요정 세트 (귀여운 산더덕 하이커 캐릭터).',
    energy: 50,
    maxEnergy: 100,
    fedCount: 1,
    petCount: 2,
    isUnlocked: true,
    imageUrl: 'https://blog.kakaocdn.net/dna/VThUy/dJMcadhSWiO/AAAAAAAAAAAAAAAAAAAAAEEUE5orqvHIfoJxfnH7Bhhmunb3F_uXLLd2lAE39d7Q/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1780239599&allow_ip=&allow_referer=&signature=ucs%2BJH4aaTGEuC65aGyVMq1yk%2FU%3D',
  },
  // The remaining 3 are kept as secret silhouette references
  {
    id: 'secret1',
    name: '신비의 솔잎',
    emoji: '👤',
    rarity: 'UNCOMMON',
    desc: '치유의 숲 삼나무 마루 깊숙이 은둔 중인 고요 속 비밀 정령.',
    energy: 0,
    maxEnergy: 100,
    fedCount: 0,
    petCount: 0,
    isUnlocked: false,
  },
  {
    id: 'secret3',
    name: '석양 도끼비',
    emoji: '👤',
    rarity: 'RARE',
    desc: '산봉우리에 해가 걸칠 때 잠깐 실루엣이 스치는 횡성의 태고 정령.',
    energy: 0,
    maxEnergy: 100,
    fedCount: 0,
    petCount: 0,
    isUnlocked: false,
  },
  {
    id: 'secret4',
    name: '금강 꽃누리',
    emoji: '👤',
    rarity: 'RARE',
    desc: '횡성 국향 다루기 정원의 온기를 마시고 살아난 금빛 국화의 신비로운 정령.',
    energy: 0,
    maxEnergy: 100,
    fedCount: 0,
    petCount: 0,
    isUnlocked: false,
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    name: '🥟 안흥 명품 찐빵의 길',
    category: 'bread',
    emoji: '🥟',
    distance: '1.8km',
    timeEstimate: '도보 35분',
    points: 120,
    tags: ['전통 명물가마솥', '단팥의 정성', '주포산책로'],
    locked: false,
    info: '백년 가업의 온기를 품은 안흥 찐빵 가마솥의 하얀 김을 따라 주포천 물소리를 함께 걸으며 감성을 채우는 골목길 웰니스 탐방 코스입니다.',
    guideMapPoints: [
      { name: '안흥찐빵 삼거리광장', x: 22, y: 70, detail: '출발: 안흥 만화 동상과 백가마솥 포토존' },
      { name: '주포천 돌다리', x: 48, y: 50, detail: '맑은 천가 물소리를 감상하는 사운드스팟' },
      { name: '장독 전통 보존터', x: 74, y: 32, detail: '할머니 귓속말 비밀 단서가 전해지는 고요 옹기돌' }
    ],
    kakaoLink: 'https://map.kakao.com/?q=횡성안흥찐빵마을'
  },
  {
    id: 'c2',
    name: '🌲 청태산 피톤치드 치유의 길',
    category: 'nature',
    emoji: '🌲',
    distance: '3.2km',
    timeEstimate: '도보 70분',
    points: 150,
    tags: ['잣나무 원시림', '숲 무장애길', '흙내음 향기'],
    locked: false,
    info: '아스팔트 소음을 완벽히 차단하고 수백 그루 아름드리 잣나무 사이 데크길을 밟으며 횡성의 깊은 대자연 주파수로 심신의 오염을 지워내는 청정 자연길.',
    guideMapPoints: [
      { name: '숲체원 무장애 입구', x: 18, y: 62, detail: '시작: 나무데크가 시작되는 치유기점' },
      { name: '사색과 새소리 언덕', x: 52, y: 44, detail: '나무 아래 숨겨진 단서 QR 조형물 자리' },
      { name: '잣나무 하늘마루', x: 82, y: 22, detail: '종점: 바람이 수놓는 솔밭 하늘지평선 전망데크' }
    ],
    kakaoLink: 'https://map.kakao.com/?q=국립횡성숲체원'
  },
  {
    id: 'c3',
    name: '🐮 횡성 한우 정령의 길',
    category: 'beef',
    emoji: '🐮',
    distance: '2.5km',
    timeEstimate: '도보 50분',
    points: 180,
    tags: ['한우 전통골목', '섬강 둔치길', '참숯 화로가'],
    locked: true,
    info: '횡성 섬강 수맥의 보드라운 풀바람을 관찰하고 미식 가치와 로컬 미학을 음미해 보는 특별 웰니스 힐링 코스입니다.',
    guideMapPoints: [
      { name: '섬강 생태 수변로', x: 28, y: 75, detail: '수초가 물결치는 잔잔한 섬강 탐방 첫관문' },
      { name: '한우 문화 정각', x: 58, y: 48, detail: '장인의 숨결이 서린 참숯 내음을 음미하는 감각정원' },
      { name: '목동 풍경 조각마당', x: 80, y: 28, detail: '종착: 소와 목동 동상이 마음을 따뜻하게 안아주는 전당' }
    ],
    kakaoLink: 'https://map.kakao.com/?q=횡성한우체험관'
  },
  {
    id: 'c4',
    name: '🧘 태기산 웅장한 명상의 길',
    category: 'zen',
    emoji: '🧘',
    distance: '4.8km',
    timeEstimate: '도보 110분',
    points: 220,
    tags: ['구름안개 능선', '바람 풍차소리', '우주 사색언덕'],
    locked: true,
    info: '해발 1,200m 태기산맥의 장엄한 하얀 바람 풍력발전기 밑을 걸어가며 자연의 거대한 기운과 조우하고 내면의 잡음을 완벽하게 소멸시키는 명상의 끝판왕 길.',
    guideMapPoints: [
      { name: '바람숲 초입 고개', x: 30, y: 80, detail: '구름이 항상 발 아래 내려안는 안개 산맥기점' },
      { name: '풍력 발전기 명상데크', x: 64, y: 52, detail: '손을 가슴에 얹고 바람 바람바람 소리에 채널 동기화' },
      { name: '태기산 정상 낙조쉼터', x: 88, y: 18, detail: '산 정상에서 저무는 일몰을 명상하는 우주의 눈망울' }
    ],
    kakaoLink: 'https://map.kakao.com/?q=태기산전망대'
  }
];

export const ALL_COUPONS_POOL: Omit<Coupon, 'id' | 'used' | 'code'>[] = [
  {
    title: '🥟 원조 가마솥 안흥찐빵 1박스 무료 교환권',
    provider: '삼거리 명가 안흥찐빵 본점',
    discount: '12,000원 상당 즉시 수령',
    expireDate: '2026.09.30',
  },
  {
    title: '🐮 횡성축협 한우 명품정육 꽃등심 15,000원 상품권',
    provider: '횡성축협 한우 정육식당 본점',
    discount: '15,000원 식사 차감 할인',
    expireDate: '2026.08.31',
  },
  {
    title: '🌲 국립횡성숲체원 삼나무 테라피차 & 삼비 매트 체험권',
    provider: '국립횡성숲체원 마음힐링동',
    discount: '테라피 케어 1회 코스 전액 지원',
    expireDate: '2026.11.15',
  },
  {
    title: '🥛 횡성 들꽃 목장 자연 유기농 요거트 대교환권',
    provider: '횡성 들꽃 전당 카페테리아',
    discount: '수제 요거트 패키지(500ml) 무료',
    expireDate: '2026.10.12',
  },
  {
    title: '🍵 웰니스 명상 카페 고요 벌꿀 더덕라떼 무료 음료권',
    provider: '대평리 브루잉 카페 고요',
    discount: '더덕 벌꿀 웰니스 티 1잔 제공',
    expireDate: '2026.12.31',
  }
];

// COMPLETE 1ST TO 15TH RANKINGS LIST AS REQUESTED BY THE USER (Prof. Kim Yong-su is #1, ranked by time in minutes)
export const INITIAL_RANKINGS: RankingUser[] = [
  { rank: 1, name: '디인예왕김용수교수님', points: 2450, avatar: '👑' },
  { rank: 2, name: '태기산신령', points: 1820, avatar: '👴' },
  { rank: 3, name: '횡성우왕', points: 1650, avatar: '🐮' },
  { rank: 4, name: '피톤치드중독자', points: 1420, avatar: '🌲' },
  { rank: 5, name: '안흥가마할매', points: 1280, avatar: '👵' },
  { rank: 6, name: '숲체원지킴이', points: 1100, avatar: '🧝' },
  { rank: 7, name: '걸어서세계속으로', points: 950, avatar: '🚶' },
  { rank: 8, name: '명상소년', points: 870, avatar: '👦' },
  { rank: 9, name: '요가구루', points: 720, avatar: '🧘' },
  { rank: 10, name: '수달패밀리', points: 630, avatar: '🦦' },
  { rank: 11, name: '한우는옳다', points: 510, avatar: '🥩' },
  { rank: 12, name: '안흥찐빵메이커', points: 420, avatar: '🥟' },
  { rank: 13, name: '도토리수령자', points: 320, avatar: '🐿️' },
  { rank: 14, name: '아침이슬향기', points: 210, avatar: '💧' },
  { rank: 15, name: '고요나그네 (나)', points: 105, isMe: true, avatar: '🧘' }
];

export const INITIAL_SECRET_SPOTS: SecretSpot[] = [
  {
    id: 's1',
    title: '600년 고목의 보물코드',
    hint: '🌲 국립횡성숲체원 온열체험동 뒤풀이 잣나무 계곡 아래, 600년 수령 보호수 옹이구멍에 숨어있는 오프라인 큐알(QR) 판넬 단서',
    isRevealed: false,
    location: '국립횡성숲체원 산책 삼나무길 수색구역',
    qrUrlValue: 'goyo:spot:600_tree'
  },
  {
    id: 's2',
    title: '망향의 호수 눈동자',
    hint: '🏞️ 횡성호수길 5코스 중간 솔나무 바람정자 쉼터 우측 목재 벤치 밑단에 기공된 고요로 신비 로고 조각',
    isRevealed: false,
    location: '횡성호수길 갈대숲 전망전각',
    qrUrlValue: 'goyo:spot:lake_eye'
  },
  {
    id: 's3',
    title: '장독 가마할매 귓소문',
    hint: '🥟 안흥명품찐빵 마을 뒷골목 백가마 가마솥 전골 솥뚜껑 뒤 장독대 세번째 옹기 옹벽 돌담길 틈새 카드',
    isRevealed: false,
    location: '안흥찐빵 전통 가옥 돌담골',
    qrUrlValue: 'goyo:spot:grandma_secret'
  },
  {
    id: 's4',
    title: '태기산 안개바람 옹달샘',
    hint: '🧘 태기산 풍력발전기 7호기 수직탑 기둥 뒤 그늘진 돌확 우울물속에 밤낮 잠겨진 스크래칭 코드',
    isRevealed: false,
    location: '태기산 해발 980미터 원풍차 쉼터',
    qrUrlValue: 'goyo:spot:misty_well'
  }
];

export const SPIRIT_LETTERS: SpiritLetter[] = [
  {
    id: 'l1',
    writer: '방구 (아기 황소)',
    avatar: '🐮',
    title: '음머어~ 벗에게 보내는 묵직한 가을편지 💌',
    content: '그대가 눈을 포근히 감고 디지털 세상을 단절한 보람이 가득해서 아주 기쁘다 음머어! 횡성 푸른 잔디풀보다 부드럽고 가치 깊은 명상 생활을 이어가다 보면 꼭 횡성시장 따뜻한 수수부꾸미 같은 가슴 충만한 행복이 찾아올 거다! 오늘도 행복하게 내 코를 부벼주어 고맙소! 편안하세 음메애~!',
    date: '오늘 아침 도착'
  },
  {
    id: 'l2',
    writer: '도도 (물방울 요정)',
    avatar: '💧',
    title: '톡! 흐려지지 말기, 촉촉한 우정의 엽서 🎐',
    content: '톡! 내가 잣나무 숲체원 솔잎 아래서 스마트폰 꺼두는 걸 몰래 세고 있었지롱. 엄청 칭찬해주겠어! 내 맑고 깨끗한 아침 감성 엑기스를 마음에 한 방울 똑 떨어뜨려 줄 테니까 도시 피로 따위 다 말끔히 정화하길 바래! 영원히 시들지 마 우린 단짝이니까!',
    date: '어제 낮 도착'
  },
  {
    id: 'l3',
    writer: '먹과 구름이 (안개구름 세트)',
    avatar: '☁️🐈',
    title: '퐁실퐁실 푸른 하늘에서 전하는 구름안개 소원 ☁️',
    content: '우리가 태기산 정상에서 가만히 불어오는 부드로운 실바람 속에 누워있다는 걸 그대도 알고 있나요? 폭신한 숲체원 숲마당에서 마음껏 이완하세요. 눈을 감는 그곳이 바로 그대의 맑은 고요로 우주입니다.',
    date: '3일 전 도착'
  },
  {
    id: 'l4',
    writer: '달달이 (섬강 수달)',
    avatar: '🦦',
    title: '찹찹! 물결치는 행복을 조개 껍질에 실어 보냅니다 🐚',
    content: '맑고 고요한 물결이 찰랑찰랑 흐르는 수심가에 싱그러운 발자국 가득하네요! 디지털 모바일을 비워둔 그윽한 자리에 물살의 유쾌한 노래가 가득 들어설 거라 장담합니다! 횡성 호수길을 지탱하는 사랑가 가득 받아가랑🦦!',
    date: '일주일 전 도착'
  }
];

export const INITIAL_JOURNAL_LOGS: JournalLog[] = [
  {
    id: 'j1',
    date: '2026.05.28 (오늘)',
    course: '🌲 청태산 피톤치드 치유의 길',
    title: '비로소 마음이 머무는 고목 아래',
    quote: '스마트폰 전원을 차단하고 숲체원 무장애길에 가만히 발을 올렸다. 30분이 흐르자 새소리 주파수가 도시 이명 소리를 정화하고, 바람 한 자락이 볼 끝을 어루만진다. 횡성이 가진 고귀한 가치를 몸소 치유했다.',
    tags: ['🌲 잣나무 피톤치드', '👣 4,200보', '🔉 오프라인 자연샤워'],
    duration: '1시간 12분'
  },
  {
    id: 'j2',
    date: '2026.05.24',
    course: '🥟 안흥 명품 찐빵의 길',
    title: '모락모락 솟구치는 백년지기 시골내음',
    quote: '수수한 안흥 마을 강가 돌담길에 찐빵 앙금의 달보드레한 누룩 스팀이 은은히 피어난다. 스마트폰 렌즈 속 피사체만 쫓는 시선을 내 발등으로 깊숙이 옮기니 수염 뽑힌 시골 강아지 웃음에도 조심스레 미소가 샘솟는다.',
    tags: ['🥟 달인 가마솥 스팀', '🤝 소박한 골목', '👣 3,800보'],
    duration: '45분'
  }
];
