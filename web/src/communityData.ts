import type { Item } from './api';

export const communityTopics = ['후기공유', '같이갈래요', '일상잡담', '질문'] as const;
export const communityRegions = ['서울', '대구', '부산', '인천', '기타 지역'];
export const communityMoods = ['😌 괜찮아요', '😊 아주 좋아요', '😴 피곤해요', '🥺 우울해요', '😣 답답해요', '😟 불안해요'];
export const communityPeriods = [{ value: '주간', label: '☀ 주간 (06:00–18:00)' }, { value: '야간', label: '☾ 야간 (18:00–24:00)' }];

export type CommunityComment = { id: string; author: string; text: string; mine?: boolean };
export type CommunityPost = {
  id: string; tag: string; author: string; text: string; liked: boolean; likes: number;
  title?: string; mine?: boolean; region?: string; period?: string; mood?: string;
  gallery?: string[]; photos?: string[]; bookmarked?: boolean; comments?: CommunityComment[];
  commentsAllowed?: boolean; visibility?: 'public' | 'private'; createdAt?: number;
  place?: Item; samplePlace?: string; featured?: boolean; sampleTime?: string;
};

const examples: CommunityPost[] = [
  {
    id: 'example-1', tag: '후기공유', author: '몽글이', title: '퇴근길에 만난 조용한 밤 산책 🌙',
    text: '강변을 천천히 걷다 보니 강물에 비친 불빛이 눈에 들어왔어요. 잠깐 바람만 쐬어도 마음이 가벼워졌어요.',
    liked: false, likes: 72, region: '대구', period: '야간', mood: communityMoods[0], featured: true, sampleTime: '6시간 전',
    gallery: ['park', 'cafe'], samplePlace: '대구 신천 산책로',
    comments: [
      { id: 'sample-1', author: '하루', text: '저도 저녁에 천천히 걸어보고 싶어요!' },
      { id: 'sample-2', author: '소라', text: '밤바람 맞으면서 걷기 좋겠네요 :)' },
    ],
  },
  {
    id: 'example-2', tag: '후기공유', author: '보랏빛', title: '빛으로 만난 작은 전시 🎨',
    text: '전시장을 천천히 돌다 보니 같은 작품도 보는 각도마다 다르게 보였어요. 조용히 쉬고 싶을 때 또 가려고요.',
    liked: false, likes: 54, region: '대구', period: '야간', mood: communityMoods[1], sampleTime: '12시간 전',
    gallery: ['gallery', 'gallery'], samplePlace: '대구미술관',
  },
  {
    id: 'example-3', tag: '일상잡담', author: '느긋한 하루', title: '집 앞에서 보낸 10분',
    text: '오늘은 집 앞을 10분 걸어봤어요. 크지 않은 변화도 충분한 것 같아요 🌿',
    liked: false, likes: 21, region: '부산', period: '주간', mood: communityMoods[0], sampleTime: '어제',
  },
];

const storageKey = 'mumu.community.preview';

export function communityVisitPlace(post: CommunityPost): Item | undefined {
  if (post.place) return post.place;
  const name = post.samplePlace;
  if (!name) return;
  return {
    id: `community-place:${name}`,
    placeName: name,
    title: name,
    category: post.gallery?.[0] ?? 'other',
    description: '커뮤니티 글에 나온 장소예요.',
    mapUrl: `https://map.naver.com/p/search/${encodeURIComponent(name)}`,
    referenceOnly: true,
    minutes: 0,
    price: 0,
    moods: [],
    walkMinutes: -1,
    distanceM: -1,
    slots: [],
    availableSlots: [],
  };
}

export function readCommunityPosts(): CommunityPost[] {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!Array.isArray(stored)) return examples;
    return stored.filter(post => post && typeof post.id === 'string' && typeof post.text === 'string' &&
      typeof post.author === 'string' && typeof post.likes === 'number').map(post => ({
      ...(examples.find(example => example.id === post.id) ?? {}),
      ...post,
    }));
  } catch {
    return examples;
  }
}

export function saveCommunityPosts(posts: CommunityPost[]) {
  localStorage.setItem(storageKey, JSON.stringify(posts));
}

export function communityId() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function communityAuthor() {
  try {
    const profile = JSON.parse(localStorage.getItem(`mumu.profile.${localStorage.getItem('moodpass-user') ?? 'guest'}`) ?? 'null');
    if (typeof profile?.name === 'string' && profile.name.trim()) return profile.name.trim();
  } catch { /* The profile is optional. */ }
  return '나의 작은 하루';
}
