// 무무 목소리: NAVER CLOVA Voice (TTS Premium). 글자를 받아 mp3를 돌려준다. 글자·음성은 저장하지 않는다.
// 키(NCP_CLIENT_ID/SECRET)가 없으면 null → 화면이 브라우저 내장 목소리로 대신 읽는다.
import { config } from '../config.js';

/** 읽을 글 다듬기: 그림 문자·괄호 속 말은 빼고 300자까지 (긴 답장은 앞부분만) */
export function ttsText(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export async function synthesize(text: string): Promise<Buffer | null> {
  if (!config.ncpClientId || !config.ncpClientSecret || !text) return null;
  const r = await fetch('https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts', {
    method: 'POST',
    headers: { 'X-NCP-APIGW-API-KEY-ID': config.ncpClientId, 'X-NCP-APIGW-API-KEY': config.ncpClientSecret },
    body: new URLSearchParams({ speaker: config.ttsSpeaker, text, speed: '0', format: 'mp3' }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    console.warn('[tts] CLOVA Voice 실패:', r.status); // 글 내용은 로그에 남기지 않는다
    return null;
  }
  return Buffer.from(await r.arrayBuffer());
}
