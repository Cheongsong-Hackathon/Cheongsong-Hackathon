import { useEffect, useState } from 'react';
import { api, type Me } from './api';
// 카카오로 시작하기 동의 화면: 마이 > 계정과 처음 로그인 화면(MumuLogin)이 같이 쓴다
const REQUIRED = [['age14', '만 14세 이상이에요', ''], ['terms', '서비스 이용약관 동의', '/terms.html'], ['privacy', '개인정보 수집·이용 동의', '/privacy.html']] as const;
export function KakaoConsent({ onCancel, cancelLabel = '로그인 없이 둘러보기' }: { onCancel: () => void; cancelLabel?: string }) {
  const [agree, setAgree] = useState({ age14: false, terms: false, privacy: false, remember: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const start = async () => { setBusy(true); setMsg(''); const r = await api.kakaoStart(agree); if (r.url) location.href = r.url; else { setMsg(r.error ?? '잠깐 문제가 생겼어요.'); setBusy(false); } };
  return <section className="account-card" aria-label="카카오로 시작하기">
    <header><strong>무무와 시작하기</strong></header>
    {REQUIRED.map(([k, label, href]) => <label key={k} className="account-check"><input type="checkbox" checked={agree[k]} onChange={(e) => setAgree((a) => ({ ...a, [k]: e.target.checked }))} /><span>[필수] {label}</span>{href && <a href={href} target="_blank" rel="noreferrer">보기</a>}</label>)}
    <label className="account-check"><input type="checkbox" checked={agree.remember} onChange={(e) => setAgree((a) => ({ ...a, remember: e.target.checked }))} /><span>[선택] 대화 기록 남기기 · 무무가 기억하기<small>감정 이야기가 담길 수 있어요. 언제든 끌 수 있어요.</small></span></label>
    <button className="account-kakao" disabled={busy || !agree.age14 || !agree.terms || !agree.privacy} onClick={start}>동의하고 카카오로 시작</button>
    <button className="account-later" onClick={onCancel}>{cancelLabel}</button>
    {msg && <p className="account-msg" role="status">{msg}</p>}
  </section>;
}

// 마이 > 계정: 둘러보기면 카카오로 시작하기, 로그인했으면 닉네임·기억하기·로그아웃·탈퇴
export default function AccountCard() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.me().then((r) => { if (r.code === 200) { setMe(r); setName(r.nickname ?? ''); } });
    const q = new URLSearchParams(location.search).get('login');
    if (q) { setMsg(q === 'ok' ? '카카오로 시작했어요. 지금까지의 기록도 이어서 쓸 수 있어요.' : '로그인하지 못했어요. 다시 시도해 주세요.'); history.replaceState(null, '', location.pathname); }
  }, []);
  const run = async (f: () => Promise<void>) => { if (busy) return; setBusy(true); setMsg(''); try { await f(); } finally { setBusy(false); } };
  const update = (b: { nickname?: string; remember?: boolean }) => run(async () => { const r = await api.updateMe(b); if (r.code === 200) { setMe(r); setMsg(b.nickname ? '닉네임을 바꿨어요.' : r.remember ? '이제 무무가 대화를 기억해요.' : '기억을 끄고, 무무가 기억하던 것도 지웠어요.'); } else setMsg(r.error ?? '바꾸지 못했어요.'); });
  const logout = () => run(async () => { await api.logout(); location.reload(); });
  const leave = () => { if (confirm('탈퇴하면 계정과 모든 기록이 바로 지워지고 되돌릴 수 없어요. 탈퇴할까요?')) run(async () => { const r = await api.deleteMe(); if (r.deleted) location.reload(); else setMsg(r.error ?? '탈퇴하지 못했어요.'); }); };
  if (!me) return null;
  if (!me.loggedIn && open) return <KakaoConsent onCancel={() => setOpen(false)} cancelLabel="닫기" />;
  const remember = <label className="account-toggle"><input type="checkbox" checked={me.remember} disabled={busy} onChange={(e) => update({ remember: e.target.checked })} /><span><strong>무무가 대화 기억하기</strong><small>켜면 대화를 30일 보관하고 취향을 기억해요. 끄면 대화는 하루 뒤 지워져요.</small></span></label>;
  return <section className="account-card" aria-label="계정">
    {me.loggedIn ? <>
      <header><strong>카카오 계정으로 쓰는 중</strong><a href="/privacy.html" target="_blank" rel="noreferrer">개인정보 처리방침</a></header>
      <form className="account-name" onSubmit={(e) => { e.preventDefault(); if (name.trim() && name.trim() !== me.nickname) update({ nickname: name.trim() }); }}><input aria-label="닉네임" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} /><button disabled={busy || !name.trim() || name.trim() === me.nickname}>저장</button></form>
      {remember}
      <div className="account-actions"><button onClick={logout} disabled={busy}>로그아웃</button><button className="danger" onClick={leave} disabled={busy}>탈퇴하기</button></div>
    </> : <>
      <header><strong>지금은 둘러보기 중이에요</strong></header>
      <p>카카오로 시작하면 기록이 이 기기 밖에서도 이어져요. 닉네임만 받아요.</p>
      <button className="account-kakao" onClick={() => setOpen(true)}>카카오로 시작하기</button>
      {remember}
    </>}
    {msg && <p className="account-msg" role="status">{msg}</p>}
  </section>;
}
