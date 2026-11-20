import { useEffect, useState } from 'react';
import { api, type Lift } from './api';
import MumuGames from './MumuGames';
import { PhoneStatus } from './MumuWelcome';
import { speak, stopSpeaking, voicePref } from './voice';
import cheer from './assets/mumu/motion-cheer.gif';
import rest from './assets/mumu/motion-rest.gif';

// 즉시 기분 전환 화면: AI가 고른 걸 바로 해 주고(웃기·토닥임은 여기서, 타로·게임은 기존 놀이 화면을 그대로),
// 끝에 "지금 기분은 몇 점?"을 받아 시작 점수와 비교해 보여 준다.
export default function LiftScreen({ lift, busy, onOther, onOutside, onHome }: { lift: Lift; busy: boolean; onOther: () => void; onOutside: () => void; onHome: () => void }) {
  const [result, setResult] = useState<{ before: number | null; after: number; delta: number | null } | null>(null);
  const [error, setError] = useState('');
  const line = `${lift.say} ${lift.content}`.trim();
  useEffect(() => {
    setResult(null);
    if (voicePref()) void speak(line);
    return () => stopSpeaking();
  }, [lift.id]);
  async function rate(n: number) {
    setError('');
    const r = await api.liftAfter(lift.id, n);
    if (r.code === 200) setResult(r);
    else setError(r.error ?? '저장하지 못했어요. 다시 눌러 줘.');
  }
  const game = lift.mode === 'tarot' ? 'tarot' : lift.mode === 'play' ? 'balance' : null;
  const d = result?.delta;
  return <div className="lift">
    {game ? <MumuGames key={lift.id} game={game} hearts={0} onBack={onHome} /> : <>
      <PhoneStatus />
      <header className="lift-head"><button type="button" aria-label="처음으로" onClick={onHome}>‹</button><strong>{lift.title}</strong><span /></header>
      <img className="lift-mumu" src={lift.mode === 'comfort' ? rest : cheer} alt="" draggable={false} />
      <p className="lift-say">{lift.say}</p>
      {lift.content && <div className="lift-content">{lift.content}</div>}
      <button type="button" className="lift-listen" onClick={() => void speak(line)}>🔊 무무 목소리로 듣기</button>
    </>}
    {game && <p className="lift-say">무무: {lift.say}</p>}
    {lift.support && <aside className="lift-support"><p>{lift.support.text}</p>{lift.support.lines.map((l) => <a key={l.tel} href={`tel:${l.tel.replace(/[^+0-9]/g, '')}`}>{l.name} {l.tel}</a>)}</aside>}
    <section className="lift-after" aria-live="polite">
      {!result ? <>
        <h2>{game ? '다 했으면, ' : ''}지금 기분은 몇 점이야?</h2>
        <div className="lift-scale" role="group" aria-label="지금 기분 점수 1점부터 10점">{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <button key={n} type="button" onClick={() => rate(n)}>{n}</button>)}</div>
        {error && <p role="alert">{error}</p>}
      </> : <>
        <h2>{d == null ? `지금 ${result.after}점이구나!` : d > 0 ? `${result.before}점 → ${result.after}점, ${d}만큼 올랐어! 🎉` : d === 0 ? `${result.after}점 그대로구나. 다른 걸로 해 볼까?` : '조금 더 가라앉았구나. 무무가 다른 걸로 해 볼게.'}</h2>
        <div className="lift-next">
          <button type="button" className="new-primary" disabled={busy} onClick={onOther}>{busy ? '무무가 고르는 중…' : '다른 기분 전환도 해 줘'}</button>
          <button type="button" onClick={onOutside}>📍 근처로 잠깐 나가 볼래?</button>
          <button type="button" onClick={onHome}>처음으로</button>
        </div>
      </>}
    </section>
  </div>;
}
