import { useEffect, useState } from 'react';
import { chooseVoice, currentVoiceName, koreanVoices, speak, stopSpeaking } from './voice';

const SAMPLE = '안녕, 나는 무무야. 오늘 하루는 어땠어?';
/** 기기에 있는 한국어 목소리 중 무무 목소리 고르기. 누르면 미리 듣고, 그 목소리로 정한다 (이 브라우저에 기억) */
export default function VoicePicker({ onClose }: { onClose: () => void }) {
  const [voices, setVoices] = useState(koreanVoices);
  const [current, setCurrent] = useState(currentVoiceName);
  useEffect(() => {
    // 목록이 늦게 채워지는 브라우저(크롬·엣지)
    const update = () => { setVoices(koreanVoices()); setCurrent(currentVoiceName()); };
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => { speechSynthesis.removeEventListener('voiceschanged', update); stopSpeaking(); };
  }, []);
  const short = (name: string) => name.replace(/^Microsofts+/, '').replace(/s*-s*Korean.*$/i, '');
  return <div className="voice-picker" role="dialog" aria-label="무무 목소리 고르기">
    <header><strong>무무 목소리</strong><button type="button" aria-label="닫기" onClick={onClose}>×</button></header>
    {voices.length ? <ul>
      {voices.map((v) => <li key={v.name}>
        <button type="button" aria-pressed={v.name === current} onClick={() => { chooseVoice(v.name); setCurrent(v.name); void speak(SAMPLE); }}>
          <span>{short(v.name)}</span>{v.name === current ? <small>✓ 사용 중</small> : <small>▶ 들어 보기</small>}
        </button>
      </li>)}
    </ul> : <p>이 브라우저에는 한국어 목소리가 없어요. 엣지에서 열면 고를 수 있어요.</p>}
    <p className="voice-picker-note">누르면 미리 듣고 그 목소리로 바뀌어요. 엣지에 자연스러운 목소리가 가장 많아요.</p>
  </div>;
}
