import { useState } from 'react';
import { api, getPos, shrinkPhoto, type Character, type Partner, type Reward, type Run, type VerifyResult } from './api';
import { TIER_LABEL } from './Chat';
import Snail from './Snail';

const STAGE_NAME = ['', '아기 느리', '산책하는 느리', '동네 느리', '여행하는 느리'];
const DemoNote = () => <p className="notice">체험 모드: 매장과 쿠폰은 가상입니다</p>;

export function Home(p: { ch: Character | null; active: Run | null; onChat: () => void; onOpenRun: (r: Run) => void }) {
  const c = p.ch;
  const span = c?.nextStageExp ? c.nextStageExp - c.stageMinExp : 1;
  const pct = c ? (c.nextStageExp ? Math.min(100, ((c.exp - c.stageMinExp) / span) * 100) : 100) : 0;
  return (
    <div className="page home">
      <DemoNote />
      <div className="hero">
        <Snail stage={c?.stage ?? 1} patterns={c?.patterns ?? []} />
      </div>
      <h1>{STAGE_NAME[c?.stage ?? 1]}</h1>
      <p className="sub">
        레벨 {c?.level ?? 1} · {c?.stage ?? 1}단계 · 무늬 {c?.patterns.length ?? 0}개
      </p>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="다음 단계까지">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="sub small">
        {c ? (c.nextStageExp ? `경험치 ${c.exp} / ${c.nextStageExp}` : `경험치 ${c.exp} · 끝까지 자랐어`) : '느리를 불러오는 중이야'}
        {c && c.todayExp > 0 && ` · 오늘 +${c.todayExp}`}
      </p>
      <button className="btn big" onClick={p.onChat}>
        오늘 기분 어때?
      </button>
      {p.active && (
        <button className="card active" onClick={() => p.onOpenRun(p.active!)}>
          <span className={`badge tier-${p.active.tier}`}>진행 중</span>
          <strong>{p.active.title}</strong>
          <span className="meta">눌러서 이어 하기</span>
        </button>
      )}
      <p className="sub small rest">쉬는 날에도 느리는 그대로 기다려. 경험치는 줄지 않아.</p>
    </div>
  );
}

export function RunSheet(p: { run: Run; demo: boolean; onClose: () => void; onDone: (r: VerifyResult) => void }) {
  const { run } = p;
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function verify() {
    setBusy(true);
    setMsg('');
    // 위치는 인증하는 이 순간에만 읽어서 보낸다
    const pos = run.tier !== 'HOME' && !p.demo ? await getPos() : null;
    const r = await api.verify(run.runId, { ...pos, ...(photo ? { photo } : {}) });
    setBusy(false);
    if (r.verified || r.expired) return p.onDone(r);
    setMsg(r.reason ?? r.error ?? '확인하지 못했어. 다시 해 볼래?');
  }

  const steps =
    run.tier === 'HOME'
      ? ['천천히 해 봐. 하다 말아도 괜찮아.', '다 했으면 아래 버튼을 눌러 줘.']
      : run.tier === 'NEAR'
        ? ['신발을 신고 문 밖으로 나가 봐.', '시작한 곳에서 100m쯤 걸으면 돼.', '도착하면 아래 버튼을 눌러 줘.']
        : [`${run.placeName ?? '장소'}까지 천천히 가 봐.`, '도착하면 사진을 한 장 찍어 줘. 사진은 저장하지 않아.', '사진을 찍고 아래 버튼을 눌러 줘.'];

  return (
    <div className="scrim" onClick={p.onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={run.title} onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <div className="row">
          <span className={`badge tier-${run.tier}`}>{TIER_LABEL[run.tier]}</span>
          <span className="meta">
            {run.minutes}분 · +{run.exp} 경험치
          </span>
        </div>
        <h2>{run.title}</h2>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {run.tier === 'TOWN' && (
          <label className={`btn ghost photo${photo ? ' ok' : ''}`}>
            {photo ? '사진 준비됐어 (다시 찍기)' : '사진 찍기'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto(await shrinkPhoto(f));
              }}
            />
          </label>
        )}
        {msg && (
          <p className="warn" role="alert">
            {msg}
          </p>
        )}
        {p.demo && run.tier !== 'HOME' && <p className="sub small">체험 모드: 위치 확인은 시뮬레이션이에요.</p>}
        <button className="btn big" disabled={busy || (run.tier === 'TOWN' && !photo)} onClick={verify}>
          {busy ? '확인하는 중…' : run.tier === 'HOME' ? '다 했어' : run.tier === 'NEAR' ? '여기까지 걸어왔어' : '도착했어'}
        </button>
        <button className="btn text" onClick={p.onClose}>
          나중에 할게
        </button>
      </section>
    </div>
  );
}

export function Party(p: { result: VerifyResult; ch: Character | null; onClose: () => void }) {
  const r = p.result;
  return (
    <div className="scrim party" onClick={p.onClose}>
      <section className="sheet center" role="dialog" aria-modal="true" aria-label="활동 완료" onClick={(e) => e.stopPropagation()}>
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${6 + i * 6.5}%`, animationDelay: `${(i % 5) * 0.12}s` }} />
          ))}
        </div>
        <Snail stage={p.ch?.stage ?? 1} patterns={p.ch?.patterns ?? []} size={170} happy />
        <h2>해냈어!</h2>
        <p className="gain">+{r.expGained} 경험치</p>
        <p className="sub">껍데기에 무늬가 하나 늘었어.</p>
        {r.note && <p className="sub small">{r.note}</p>}
        {r.stageUp && <p className="pill">느리가 한 단계 자랐어</p>}
        {r.newRewards.length > 0 && (
          <div className="card soft">
            <strong>쿠폰 {r.newRewards.length}장이 도착했어</strong>
            <span className="meta">기록 탭의 보상함에서 볼 수 있어. (체험 모드: 가상 쿠폰)</span>
          </div>
        )}
        <button className="btn big" onClick={p.onClose}>
          좋아
        </button>
      </section>
    </div>
  );
}

export function Records(p: { done: Run[]; rewards: Reward[]; onRedeem: (id: number) => void }) {
  const [open, setOpen] = useState<Reward | null>(null);
  return (
    <div className="page">
      <h1 className="title">보상함</h1>
      {p.rewards.length === 0 && <p className="empty">3단계가 되면 제휴 매장 쿠폰이 여기 들어와.</p>}
      {p.rewards.map((w) => (
        <button key={w.id} className={`card coupon${w.used ? ' used' : ''}`} onClick={() => setOpen(w)}>
          <strong>{w.placeName}</strong>
          <span>{w.benefit}</span>
          <span className="meta">{w.used ? '사용 완료' : '눌러서 쿠폰 코드 보기'}</span>
        </button>
      ))}
      <h1 className="title">완료한 활동</h1>
      {p.done.length === 0 && <p className="empty">아직 기록이 없어. 없어도 괜찮아.</p>}
      {p.done.map((r) => (
        <div key={r.runId} className="card done">
          <span className={`badge tier-${r.tier}`}>{TIER_LABEL[r.tier]}</span>
          <strong>{r.title}</strong>
          <span className="meta">
            {r.completedAt && new Date(r.completedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · +{r.expGained ?? 0}
          </span>
        </div>
      ))}
      {open && (
        <div className="scrim" onClick={() => setOpen(null)}>
          <section className="sheet center" role="dialog" aria-modal="true" aria-label="쿠폰" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <h2>{open.placeName}</h2>
            <p className="sub">{open.benefit}</p>
            <p className="code">{open.code}</p>
            <p className="notice">체험 모드: 매장과 쿠폰은 가상입니다</p>
            {!open.used && (
              <button
                className="btn big"
                onClick={() => {
                  p.onRedeem(open.id);
                  setOpen(null);
                }}
              >
                매장에서 사용하기
              </button>
            )}
            <button className="btn text" onClick={() => setOpen(null)}>
              닫기
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export function Partners({ items }: { items: Partner[] }) {
  return (
    <div className="page">
      <DemoNote />
      <h1 className="title">제휴 매장</h1>
      {items.length === 0 && <p className="empty">매장 목록을 불러오지 못했어.</p>}
      {items.map((s) => (
        <div key={s.id} className="card shop">
          <span className="badge partner">{s.category}</span>
          <strong>{s.name}</strong>
          <span>{s.couponPolicy}</span>
        </div>
      ))}
      <p className="sub small">제휴 매장과 무료 장소는 경험치가 같아. 마음 가는 곳으로 가면 돼.</p>
    </div>
  );
}

/** 안전 모드: 추천과 게임 요소를 모두 숨긴 차분한 화면 */
export function Safety({ onBack }: { onBack: () => void }) {
  return (
    <div className="safety">
      <h1>지금 많이 힘들구나</h1>
      <p>말해 줘서 고마워. 혼자 버티지 않아도 돼. 아래 번호는 24시간 열려 있고, 전화하면 전문 상담원이 이야기를 들어 줘.</p>
      <a className="btn big call" href="tel:109">
        자살예방상담전화 109
      </a>
      <a className="btn big call" href="tel:15770199">
        정신건강 위기상담 1577-0199
      </a>
      <p className="small">지금 당장 위험하다면 112나 119에 전화해 줘.</p>
      <button className="btn text" onClick={onBack}>
        대화로 돌아갈래
      </button>
    </div>
  );
}
