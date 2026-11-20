import { useRef, useState } from 'react';
import { api, type SajuInput, type SajuRecord } from './api';
import MumuGameScene from './MumuGameScene';

const topics = [
  { id: 'daily', label: '오늘의 흐름' }, { id: 'love', label: '연애·관계' },
  { id: 'career', label: '진로·학업·일' }, { id: 'choice', label: '선택·고민' },
] as const;
const branches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const pillarLabels = [['year', '년주'], ['month', '월주'], ['day', '일주'], ['hour', '시주']] as const;
const hour = (value: number) => String((value + 24) % 24).padStart(2, '0');

function FortuneResult({ record }: { record: SajuRecord }) {
  return <section className="game-panel fortune-result">
    <h2>사주 원국</h2>
    <p>양력 {record.solarBirthDate} · 한국 표준시</p>
    <table className="saju-pillars" aria-label="사주 네 기둥">
      <thead><tr><td></td>{pillarLabels.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">천간</th>{pillarLabels.map(([key]) => {
          const value = record.pillars[key];
          return <td key={key} data-element={value?.stemElement}>{value ? <><strong>{value.stem}</strong><small>{value.stemElement}</small></> : '—'}</td>;
        })}</tr>
        <tr><th scope="row">지지</th>{pillarLabels.map(([key]) => {
          const value = record.pillars[key];
          return <td key={key} data-element={value?.branchElement}>{value ? <><strong>{value.branch}</strong><small>{value.branchElement}</small></> : '—'}</td>;
        })}</tr>
      </tbody>
    </table>
    {!record.pillars.hour && <p className="fortune-privacy">태어난 시간을 몰라 시주를 제외했어요. 절입 계산은 정오를 기준으로 했어요.</p>}
    {record.nearSolarTerm && <p className="fortune-privacy">절입에 가까운 날이에요. 출생 시각과 절기 계산 방식에 따라 년주 또는 월주가 달라질 수 있어요.</p>}
    <h2>오행 균형</h2>
    <ul className="saju-elements">{record.elements.distribution.map(row => <li key={row.element}>
      <span data-element={row.element}>{row.element}</span>
      <meter min={0} max={record.elements.total} value={row.count} aria-label={`${row.element} ${row.count}개`} />
      <span>{row.count}개 · {row.percentage}%</span>
    </li>)}</ul>
    <p><strong>많은 오행</strong> {record.elements.dominant.join(' · ')}<br /><strong>없는 오행</strong> {record.elements.lacking.join(' · ') || '없음'}</p>
    <p className="fortune-privacy">표에 보이는 천간과 지지의 오행을 센 값이에요.</p>
    <aside><h2>일간 · {record.dayMaster.stem} ({record.dayMaster.element})</h2><p>{record.dayMaster.summary}</p></aside>
    <aside><h2>{record.reading.title}</h2><p>{record.reading.advice}</p></aside>
  </section>;
}

export default function MumuFortune() {
  const [view, setView] = useState<'form' | 'result' | 'history'>('form');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [timeMode, setTimeMode] = useState<'unknown' | 'exact' | 'branch'>('unknown');
  const [branch, setBranch] = useState('자시');
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar');
  const [leap, setLeap] = useState(false);
  const [gender, setGender] = useState<SajuInput['gender'] | ''>('');
  const [topic, setTopic] = useState<NonNullable<SajuInput['topic']>>('daily');
  const [result, setResult] = useState<SajuRecord | null>(null);
  const [history, setHistory] = useState<SajuRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const resultStart = useRef<HTMLDivElement>(null);
  const today = new Date(Date.now() + 9 * 60 * 60_000).toISOString().slice(0, 10);

  function openResult(record: SajuRecord) {
    setResult(record);
    setCopied('');
    setView('result');
    requestAnimationFrame(() => resultStart.current?.scrollIntoView({ block: 'start' }));
  }

  async function reveal() {
    if (busy || !gender) return;
    setBusy(true);
    setError('');
    const selectedTime = timeMode === 'exact' ? birthTime : timeMode === 'branch' ? branch : 'unknown';
    const response = await api.analyzeSaju({ birthDate, birthTime: selectedTime, calendarType, lunarLeapMonth: calendarType === 'lunar' && leap, gender, topic });
    if (response.code === 201) openResult(response);
    else setError(response.error ?? '사주를 계산하지 못했어요. 다시 시도해 주세요.');
    setBusy(false);
  }

  async function openHistory() {
    setView('history');
    setBusy(true);
    setError('');
    const response = await api.sajuHistory();
    if (response.code === 200) setHistory(response.history);
    else setError(response.error ?? '사주 기록을 불러오지 못했어요.');
    setBusy(false);
  }

  async function clearHistory() {
    if (!window.confirm('저장된 사주풀이 기록을 모두 지울까요?')) return;
    setBusy(true);
    setError('');
    const response = await api.clearSajuHistory();
    if (response.code === 200) { setHistory(response.history); setResult(null); }
    else setError(response.error ?? '기록을 지우지 못했어요.');
    setBusy(false);
  }

  async function share(record: SajuRecord) {
    const text = `무무의 사주풀이 · ${record.reading.title}\n${record.reading.advice}`;
    try {
      if (navigator.share) await navigator.share({ title: '무무의 사주풀이', text });
      else { await navigator.clipboard.writeText(text); setCopied('결과를 복사했어요.'); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setCopied('결과를 공유하지 못했어요.');
    }
  }

  return <>
    <nav className="fortune-categories" aria-label="사주 메뉴">
      <button type="button" disabled={busy} aria-pressed={view !== 'history'} onClick={() => { setError(''); setView('form'); }}>사주풀이</button>
      <button type="button" disabled={busy} aria-pressed={view === 'history'} onClick={() => void openHistory()}>풀이 기록</button>
    </nav>
    {view === 'form' && <>
      <MumuGameScene theme="fortune">무무와 함께<br />재미로 보는 사주풀이 💜</MumuGameScene>
      <form className="game-panel fortune-form" onSubmit={event => { event.preventDefault(); void reveal(); }}>
        <h2>출생 정보</h2>
        <label>달력
          <select value={calendarType} onChange={event => {
            setCalendarType(event.target.value === 'lunar' ? 'lunar' : 'solar');
            setLeap(false);
          }}><option value="solar">양력</option><option value="lunar">음력</option></select>
        </label>
        <label>생년월일
          {calendarType === 'lunar'
            ? <input key="lunar" type="text" required pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" placeholder="예: 2000-02-30" maxLength={10} value={birthDate} onChange={event => setBirthDate(event.target.value)} />
            : <input key="solar" type="date" required min="1900-01-01" max={today} value={birthDate} onChange={event => setBirthDate(event.target.value)} />}
        </label>
        {calendarType === 'lunar' && <label>윤달 <input className="saju-check" type="checkbox" checked={leap} onChange={event => setLeap(event.target.checked)} /></label>}
        <label>태어난 시간
          <select value={timeMode} onChange={event => setTimeMode(event.target.value === 'exact' ? 'exact' : event.target.value === 'branch' ? 'branch' : 'unknown')}>
            <option value="unknown">모름</option><option value="exact">시·분 입력</option><option value="branch">시진으로 선택</option>
          </select>
        </label>
        {timeMode === 'exact' && <label>시·분 <input type="time" required value={birthTime} onChange={event => setBirthTime(event.target.value)} /></label>}
        {timeMode === 'branch' && <label>시진 <select value={branch} onChange={event => setBranch(event.target.value)}>
          {branches.map((value, index) => <option key={value} value={`${value}시`}>{value}시 ({hour(2 * index - 1)}:00–{hour(2 * index)}:59)</option>)}
        </select></label>}
        <label>성별 <select required value={gender} onChange={event => setGender(event.target.value === 'male' ? 'male' : event.target.value === 'female' ? 'female' : '')}>
          <option value="" disabled>선택해 주세요</option><option value="female">여성</option><option value="male">남성</option>
        </select></label>
        <label>풀이 주제 <select value={topic} onChange={event => {
          const choice = topics.find(value => value.id === event.target.value);
          if (choice) setTopic(choice.id);
        }}>{topics.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}</select></label>
        <small className="fortune-privacy">출생 정보와 풀이를 서버에 저장해요. 이 브라우저의 풀이 기록에서 확인하거나 지울 수 있어요.</small>
        <button className="game-primary" type="submit" disabled={busy}>{busy ? '계산 중…' : '✨ 사주풀이 보기'}</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </>}
    {view === 'result' && result && <>
      <div ref={resultStart}><MumuGameScene theme="fortune" layout="side">사주풀이가 완성됐어! 💜</MumuGameScene></div>
      <FortuneResult record={result} />
      <div className="fortune-actions">
        <button type="button" className="game-primary" onClick={() => void share(result)}>결과 공유하기</button>
        <button type="button" onClick={() => setView('form')}>다시 입력하기</button>
      </div>
      {copied && <p className="fortune-privacy" role="status">{copied}</p>}
    </>}
    {view === 'history' && <section className="game-panel tarot-history">
      <h2>저장된 사주풀이</h2>
      {busy ? <p role="status">잠시만 기다려 주세요…</p> : error ? <>
        <p role="alert">{error}</p><button type="button" className="btn ghost" onClick={() => void openHistory()}>다시 불러오기</button>
      </> : history.length ? <>
        <ul>{history.map(record => <li key={record.id}>
          <button type="button" className="saju-history-entry" onClick={() => openResult(record)}>
            <strong>{record.reading.title}</strong><time dateTime={record.timestamp}>{new Date(record.timestamp).toLocaleString('ko-KR')}</time>
          </button>
        </li>)}</ul>
        <button type="button" className="btn ghost" onClick={() => void clearHistory()}>기록 지우기</button>
      </> : <p>아직 저장된 풀이가 없어요.</p>}
    </section>}
  </>;
}
