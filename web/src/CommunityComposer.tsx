import { useRef, useState } from 'react';
import { api, type Item, type LatLng } from './api';
import MumuArtwork from './MumuArtwork';
import { PhoneStatus } from './MumuWelcome';
import { savedPlaceDetails } from './savedPlaces';
import { communityAuthor, communityId, communityMoods, communityPeriods, communityRegions, communityTopics, type CommunityPost } from './communityData';

async function photoPreview(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 520 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image canvas is unavailable');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .76);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CommunityComposer({ onBack, onPost, position }: {
  onBack: () => void;
  onPost: (post: CommunityPost) => boolean;
  position: () => Promise<LatLng | null>;
}) {
  const [tag, setTag] = useState<string>(communityTopics[0]);
  const [mood, setMood] = useState(communityMoods[0]);
  const [region, setRegion] = useState(communityRegions[0]);
  const [period, setPeriod] = useState('주간');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [place, setPlace] = useState<Item | null>(null);
  const [placeOptions, setPlaceOptions] = useState<Item[] | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [commentsAllowed, setCommentsAllowed] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [error, setError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);

  async function openPlaces() {
    setPlaceOpen(true);
    if (placeOptions || placeLoading) return;
    setPlaceLoading(true);
    setPlaceError('');
    const saved = savedPlaceDetails();
    try {
      const response = await api.browse(await position(), null);
      if (response.code !== 200) throw new Error('browse failed');
      setPlaceOptions([...new Map([...saved, ...(response.items ?? [])].map(item => [item.id, item])).values()]);
    } catch {
      setPlaceOptions(saved);
      setPlaceError('탐색 스팟을 불러오지 못했어요. 찜한 장소는 선택할 수 있어요.');
    } finally {
      setPlaceLoading(false);
    }
  }

  async function addPhotos(files: File[]) {
    if (adding || !files.length) return;
    setAdding(true);
    setError('');
    try {
      const images = files.filter(file => file.type.startsWith('image/')).slice(0, 10 - photos.length);
      const previews = await Promise.allSettled(images.map(photoPreview));
      const added = previews.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      setPhotos(current => [...current, ...added].slice(0, 10));
      if (added.length < Math.min(files.length, 10 - photos.length)) setError('일부 사진을 읽지 못했어요. 다른 이미지 파일을 선택해 주세요.');
    } finally {
      setAdding(false);
    }
  }

  const matches = (placeOptions ?? []).filter(item => `${item.title} ${item.placeName}`.toLowerCase().includes(placeSearch.trim().toLowerCase()));
  return <div className="community-composer">
    <PhoneStatus />
    <form onSubmit={event => {
      event.preventDefault();
      if (!title.trim() || !text.trim() || adding) return;
      const post: CommunityPost = {
        id: communityId(), author: communityAuthor(), tag, title: title.trim(), text: text.trim(), mood, region, period,
        photos, place: place ?? undefined, liked: false, likes: 0, mine: true, commentsAllowed, visibility, createdAt: Date.now(),
      };
      if (!onPost(post)) setError('저장 공간이 부족해요. 사진을 줄이고 다시 등록해 주세요.');
    }}>
      <header className="community-composer-head">
        <button type="button" className="community-back" onClick={onBack} aria-label="커뮤니티로 돌아가기">‹</button>
        <h1>글쓰기</h1>
        <button className="community-publish" disabled={!title.trim() || !text.trim() || adding}>등록</button>
      </header>
      <section className="community-new-hero">
        <div><h2>오늘의 기분전환 순간을<br />나눠보세요!</h2></div>
        <div className="character-space"><MumuArtwork kind="community" /></div>
      </section>
      <div className="community-topic-row" role="group" aria-label="글 주제">
        {communityTopics.map(topic => <button type="button" key={topic} aria-pressed={tag === topic} onClick={() => setTag(topic)}>{topic}</button>)}
      </div>
      <div className="community-meta-row">
        <select aria-label="기분" value={mood} onChange={event => setMood(event.target.value)}>{communityMoods.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="지역" value={region} onChange={event => setRegion(event.target.value)}>{communityRegions.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="방문 시간대" value={period} onChange={event => setPeriod(event.target.value)}>{communityPeriods.map(value => <option key={value.value} value={value.value}>{value.label}</option>)}</select>
      </div>
      <label className="community-field">제목<span className="community-title-input">
        <input value={title} onChange={event => setTitle(event.target.value)} maxLength={70} placeholder="제목을 입력해 주세요" required />
        {title && <button type="button" aria-label="제목 지우기" onClick={() => setTitle('')}>×</button>}
      </span></label>
      <label className="community-field">내용
        <span className="community-body-input">
          <textarea value={text} onChange={event => setText(event.target.value)} maxLength={1000} placeholder="오늘의 이야기를 남겨 주세요" required />
          <small>{text.length} / 1,000</small>
        </span>
      </label>
      <fieldset className="community-photo-section"><legend>사진 첨부 <small>({photos.length}/10)</small></legend>
        <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={event => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          void addPhotos(files);
        }} />
        <div className="community-photo-grid">
          {photos.map((src, index) => <div key={index}><img src={src} alt={`첨부 사진 ${index + 1}`} /><button type="button" aria-label={`${index + 1}번 사진 제거`} onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}>×</button></div>)}
          {photos.length < 10 && <button type="button" disabled={adding} onClick={() => photoInput.current?.click()}><span aria-hidden="true">＋</span>{adding ? '읽는 중…' : '사진 추가'}</button>}
        </div>
      </fieldset>
      <section className="community-place-field">
        <h2>⌖ 나도 가보기 장소</h2>
        {place ? <div className="community-linked-place"><div><strong>{place.placeName}</strong><small>{place.title}</small></div><button type="button" aria-label="연결한 장소 제거" onClick={() => setPlace(null)}>×</button></div> :
          <button type="button" className="community-place-add" onClick={() => { if (placeOpen) setPlaceOpen(false); else void openPlaces(); }} aria-expanded={placeOpen}>{placeOpen ? '장소 선택 닫기' : '＋ 장소 연결하기'}</button>}
        {placeOpen && !place && <div className="community-place-results">
          <input aria-label="연결할 장소 검색" value={placeSearch} onChange={event => setPlaceSearch(event.target.value)} placeholder="장소 이름으로 찾기" />
          {placeError && <small role="status">{placeError}</small>}
          {placeLoading ? <p>스팟을 불러오는 중이에요…</p> : matches.length ?
            <ul>{matches.map(item => <li key={item.id}><button type="button" onClick={() => { setPlace(item); setPlaceOpen(false); }}><strong>{item.placeName}</strong><small>{item.title}</small></button></li>)}</ul> : <p>일치하는 스팟이 없어요.</p>}
        </div>}
      </section>
      <div className="community-publish-settings">
        <label>댓글 허용 <input type="checkbox" role="switch" checked={commentsAllowed} onChange={event => setCommentsAllowed(event.target.checked)} /></label>
        <label>공개 범위 <select value={visibility} onChange={event => setVisibility(event.target.value as 'public' | 'private')}><option value="public">전체 공개</option><option value="private">나만 보기</option></select></label>
      </div>
      <p className="community-local-note">공개 범위 설정과 게시글은 이 브라우저에만 저장돼요.</p>
      {error && <p className="community-error" role="alert">{error}</p>}
    </form>
  </div>;
}
