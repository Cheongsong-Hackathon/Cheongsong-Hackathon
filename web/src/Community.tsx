import { useEffect, useRef, useState } from 'react';
import type { Item, LatLng } from './api';
import MumuArtwork from './MumuArtwork';
import { TripHeader } from './TripUI';
import Art from './Art';
import CommunityComposer from './CommunityComposer';
import heartsMotion from './assets/mumu/motion-hearts.webp';
import { communityAuthor, communityId, communityPeriods, communityRegions, communityTopics, communityVisitPlace, readCommunityPosts, saveCommunityPosts, type CommunityPost } from './communityData';
import './community-feed.css';

const relativeTime = new Intl.RelativeTimeFormat('ko', { numeric: 'always' });
function postTime(post: CommunityPost) {
  if (post.sampleTime) return post.sampleTime;
  if (!post.createdAt || !Number.isFinite(post.createdAt)) return '내 기록';
  const minutes = Math.max(0, Math.floor((Date.now() - post.createdAt) / 60000));
  if (minutes >= 1440) return relativeTime.format(-Math.floor(minutes / 1440), 'day');
  if (minutes >= 60) return relativeTime.format(-Math.floor(minutes / 60), 'hour');
  return minutes ? relativeTime.format(-minutes, 'minute') : '방금 전';
}

function PostCard({ post, onUpdate, onDelete, onVisit, personal }: {
  post: CommunityPost;
  onUpdate: (update: Partial<CommunityPost>) => boolean;
  onDelete: () => void;
  onVisit: (item: Item) => void;
  personal: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const comments = post.comments ?? [];
  const commentInput = useRef<HTMLInputElement>(null);
  const place = communityVisitPlace(post);
  const shownComments = expanded ? comments : comments.slice(-2);
  const time = postTime(post);
  return <article className="feed-card">
    {!personal && post.featured && <span className="feed-featured">✦ 추천 게시글</span>}
    <header className="feed-card-header">
      <span className="community-avatar" aria-hidden="true">{!personal && post.author.slice(0, 1)}</span>
      <div className="feed-byline"><div><strong>{post.author}</strong>{personal ? <span>{post.tag}</span> : post.mood && <span>{post.mood}</span>}</div><small>{time} · {post.region ?? '지역 미선택'}{post.visibility === 'private' && ' · 나만 보기'}</small></div>
      {post.period && <span className="feed-period">{post.period === '야간' ? '☾ 야간' : '☀ 주간'}</span>}
      {post.mine && <details className="feed-post-menu"><summary aria-label="글 메뉴">•••</summary><button type="button" onClick={() => { if (window.confirm('이 글을 삭제할까요?')) onDelete(); }}>글 삭제</button></details>}
    </header>
    {post.title && <h2>{post.title}</h2>}
    <p className="feed-post-copy">{post.text}</p>
    {!!post.photos?.length ? <div className="feed-gallery" aria-label="게시글 사진">{post.photos.map((src, index) => <img loading="lazy" key={index} src={src} alt={`게시글 사진 ${index + 1}`} />)}</div> :
      !!post.gallery?.length && <div className="feed-gallery" aria-label="예시 장소 일러스트">{post.gallery.map((category, index) => <Art key={index} category={category} className="feed-gallery-art" />)}</div>}
    <footer className="feed-actions">
      <button type="button" aria-label={`좋아요 ${post.likes}개`} aria-pressed={post.liked} onClick={() => onUpdate({ liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) })}><span aria-hidden="true">{post.liked ? '♥' : '♡'}</span>{post.likes}</button>
      <button type="button" aria-label={`댓글 ${comments.length}개`} aria-expanded={expanded} onClick={() => { setExpanded(value => !value); if (!personal) commentInput.current?.focus(); }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11a8 8 0 0 1-8 8H5l1.2-3.7A8 8 0 1 1 21 11Z" strokeLinejoin="round" /><path d="M9 11h.1m3.9 0h.1m3.9 0h.1" strokeLinecap="round" /></svg>{comments.length}
      </button>
      {place && <button type="button" className="feed-visit" onClick={() => onVisit(place)}>⌖ 나도 가보기</button>}
      <button type="button" className="feed-bookmark" aria-label="게시글 저장" aria-pressed={!!post.bookmarked} onClick={() => onUpdate({ bookmarked: !post.bookmarked })}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill={post.bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"><path d="M6 4h12v16l-6-4-6 4z" strokeLinejoin="round" /></svg>
      </button>
    </footer>
    {(!personal || expanded) && <section className="feed-comments" aria-label="게시글 댓글">
      <header><strong>댓글 {comments.length}개</strong>{comments.length > 2 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '접기' : '더보기 ›'}</button>}</header>
      {shownComments.length > 0 && <ul>{shownComments.map(reply => <li key={reply.id}><span className="feed-comment-avatar" aria-hidden="true">{reply.author.slice(0, 1)}</span><strong>{reply.author}</strong><span>{reply.text}</span></li>)}</ul>}
      {post.commentsAllowed !== false ? <form onSubmit={event => {
        event.preventDefault();
        if (comment.trim() && onUpdate({ comments: [...comments, { id: communityId(), author: communityAuthor(), text: comment.trim(), mine: true }] })) {
          setComment('');
          setExpanded(true);
        }
      }}>
        <input ref={commentInput} aria-label="댓글 내용" maxLength={300} value={comment} onChange={event => setComment(event.target.value)} placeholder="댓글을 남겨보세요!" />
        <button aria-label="댓글 등록" disabled={!comment.trim()}>➤</button>
      </form> : <small>이 글은 댓글을 받지 않아요.</small>}
    </section>}
  </article>;
}

type CommunityProps = {
  onNotifications: () => void;
  onVisit: (item: Item) => void;
} & ({ position: () => Promise<LatLng | null>; onBack?: never } | { onBack: () => void; position?: never });

export default function Community({ onNotifications, onVisit, position, onBack }: CommunityProps) {
  const personal = Boolean(onBack);
  const [posts, setPosts] = useState(readCommunityPosts);
  const [filter, setFilter] = useState('전체');
  const [region, setRegion] = useState('');
  const [period, setPeriod] = useState('');
  const [sort, setSort] = useState('최신순');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => { root.current?.closest('main')?.scrollTo(0, 0); }, [writing]);

  function save(next: CommunityPost[]) {
    try {
      saveCommunityPosts(next);
      setPosts(next);
      setError('');
      return true;
    } catch {
      setError('변경을 저장하지 못했어요. 브라우저의 저장 공간을 확인해 주세요.');
      return false;
    }
  }

  const query = search.trim().toLowerCase();
  const visible = posts.filter(post => (!personal || post.mine === true) && (filter === '전체' || post.tag === filter) && (!region || post.region === region) &&
    (!period || post.period === period) && `${post.author} ${post.title ?? ''} ${post.text}`.toLowerCase().includes(query));
  if (sort === '좋아요순') visible.sort((a, b) => b.likes - a.likes);
  else if (personal) visible.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return <div className={`new-community trip-community community-v2${personal ? ' my-posts' : ''}`} ref={root}>
    {writing && position ? <CommunityComposer position={position} onBack={() => setWriting(false)} onPost={post => {
      if (!save([post, ...posts])) return false;
      setWriting(false);
      setFilter('전체');
      setRegion('');
      setPeriod('');
      setSearch('');
      setSort('최신순');
      return true;
    }} /> : <>
      <TripHeader onBack={onBack} onNotice={onNotifications} searchLabel="게시글 검색 열기" onSearch={() => { if (showSearch) setSearch(''); setShowSearch(value => !value); }} />
      <section className="community-new-hero">
        <div>
          <h1>{personal ? '작성한 글' : '커뮤니티'}</h1>
          <p>{personal ? '내가 공유한 기분전환 기록을 모아봤어요.' : <>오늘도 무무와 함께,<br />기분전환한 순간을 나눠요!</>}</p>
        </div>
        {personal ? <div className="my-posts-mascot" aria-hidden="true"><img src={heartsMotion} alt="" draggable={false} /></div> :
          <div className="character-space"><MumuArtwork kind="community" /></div>}
      </section>
      {showSearch && <input className="trip-search" aria-label={personal ? '작성한 글 검색' : '커뮤니티 검색'} value={search} onChange={event => setSearch(event.target.value)} placeholder="이야기를 검색해 보세요" />}
      <div className="community-topic-row" role="group" aria-label="게시글 주제">
        {['전체', ...communityTopics].map(topic => <button key={topic} aria-pressed={filter === topic} onClick={() => setFilter(topic)}>{topic}</button>)}
      </div>
      <div className={`community-meta-row feed-filters${personal ? ' my-posts-list-bar' : ''}`}>
        {personal ? <p aria-live="polite">총 <strong>{visible.length}개</strong>의 글</p> : <>
        <select aria-label="지역 필터" value={region} onChange={event => setRegion(event.target.value)}><option value="">전체 지역</option>{communityRegions.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="시간 필터" value={period} onChange={event => setPeriod(event.target.value)}><option value="">◷ 전체 시간</option>{communityPeriods.map(value => <option key={value.value} value={value.value}>{value.label}</option>)}</select>
        </>}
        <select aria-label="이야기 정렬" value={sort} onChange={event => setSort(event.target.value)}><option>최신순</option><option>좋아요순</option></select>
      </div>
      {!personal && <p className="community-local-note">예시 이야기와 이 브라우저에 저장한 글이 보여요.</p>}
      <div className="feed-stack">{visible.map(post => <PostCard key={post.id} post={post} onVisit={onVisit} personal={personal}
        onUpdate={update => save(posts.map(value => value.id === post.id ? { ...value, ...update } : value))}
        onDelete={() => save(posts.filter(value => value.id !== post.id))} />)}</div>
      {!visible.length && <p className="trip-empty">{personal && !posts.some(post => post.mine) ? '아직 작성한 글이 없어요.' : '이 조건에 맞는 이야기가 없어요.'}</p>}
      {error && <p className="community-error" role="alert">{error}</p>}
      {!personal && <div className="feed-write-dock"><button type="button" aria-label="글쓰기" onClick={() => setWriting(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="m14.5 6 3.5 3.5M5 16l11-11a2.5 2.5 0 0 1 3.5 3.5L8.5 20 4 21z" strokeLinejoin="round" /></svg>
      </button></div>}
    </>}
  </div>;
}
