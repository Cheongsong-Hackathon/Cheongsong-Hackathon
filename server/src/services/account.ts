// 카카오 로그인 · 계정 · 개인정보 보관 기간 (web/public/privacy.html 참고)
// 받는 것: 카카오 회원번호 + 닉네임뿐. 카카오 토큰은 사용자 정보를 한 번 읽고 버린다(저장하지 않음).
// 로그인 유지: 서명한 쿠키(httpOnly) 하나. 세션 테이블 없음.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from '../config.js';
import { query, tx } from '../db.js';
import { wipeRecords } from './booking.js';

const SESSION = 'mumu_sid';
const OAUTH = 'mumu_oauth';
const DAY = 86_400_000;
const SESSION_DAYS = 30;

const sign = (p: string) => createHmac('sha256', config.sessionSecret).update(p).digest('base64url');
/** 위조할 수 없는 쿠키 값: base64url(JSON).서명. exp(ms)가 지나면 무효 */
export function seal(o: { exp: number } & Record<string, unknown>) {
  const p = Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${p}.${sign(p)}`;
}
export function unseal<T>(v: string | undefined): (T & { exp: number }) | null {
  if (!v || !config.sessionSecret) return null; // 비밀 값이 없으면 로그인 자체를 끈다 (빈 키 서명은 누구나 위조 가능)
  const [p, s] = v.split('.');
  if (!p || !s) return null;
  const a = Buffer.from(sign(p));
  const b = Buffer.from(s);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString());
    return typeof o?.exp === 'number' && o.exp > Date.now() ? o : null;
  } catch {
    return null;
  }
}
export function readCookie(req: Request, name: string) {
  const hit = (req.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}
const cookieOpts = (req: Request, maxAge: number, path = '/') => ({ httpOnly: true, sameSite: 'lax' as const, secure: req.secure, maxAge, path });

/** 로그인 쿠키가 있고, 그 계정이 아직 있으면 사용자 id */
export async function sessionUser(req: Request): Promise<number | null> {
  const s = unseal<{ uid: number }>(readCookie(req, SESSION));
  if (!s || !Number.isInteger(s.uid)) return null;
  const [u] = await query(`SELECT id FROM users WHERE id = $1 AND kakao_id IS NOT NULL`, [s.uid]);
  return u ? s.uid : null;
}

/** 동의 화면을 통과한 뒤 카카오 로그인 주소를 준다. 지금 둘러보기 사용자(guestId)는 처음 가입할 때 계정으로 이어받는다 */
export function startKakao(req: Request, res: Response, guestId: number) {
  if (!config.kakaoKey || !config.sessionSecret) return { status: 503, body: { error: '로그인을 준비하고 있어. 조금 뒤에 다시 해 줘.' } };
  const b = req.body ?? {};
  if (b.age14 !== true || b.terms !== true || b.privacy !== true) return { status: 400, body: { error: '필수 항목에 동의해 줘.' } };
  const nonce = randomBytes(16).toString('hex');
  // 등록된 Redirect URI와 글자까지 같아야 한다: 로컬은 Vite 프록시라 Host가 localhost:5173, 배포는 Caddy 뒤라 https
  const redirect = `${req.protocol}://${req.get('host')}/api/auth/kakao/callback`;
  res.cookie(OAUTH, seal({ nonce, guest: guestId, remember: b.remember === true, redirect, exp: Date.now() + 10 * 60_000 }), cookieOpts(req, 10 * 60_000, '/api/auth'));
  const q = new URLSearchParams({ client_id: config.kakaoKey, redirect_uri: redirect, response_type: 'code', state: nonce });
  return { status: 200, body: { url: `https://kauth.kakao.com/oauth/authorize?${q}` } };
}

async function kakaoProfile(code: string, redirect: string) {
  const form = new URLSearchParams({ grant_type: 'authorization_code', client_id: config.kakaoKey, redirect_uri: redirect, code });
  if (config.kakaoClientSecret) form.set('client_secret', config.kakaoClientSecret);
  const t = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', body: form, signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  if (!t?.access_token) throw Error(`token ${t?.error_code ?? t?.error ?? 'no token'}`);
  const me = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: `Bearer ${t.access_token}` }, signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  if (me?.id == null) throw Error('user/me 실패');
  const p = me.kakao_account?.profile;
  const nickname = typeof p?.nickname === 'string' && p.nickname.trim() && !p.is_default_nickname ? p.nickname.trim().slice(0, 20) : '무무 친구';
  return { kakaoId: String(me.id), nickname };
}

/** 이미 가입한 카카오 계정이면 그 계정으로, 처음이면 지금 둘러보기 기록을 계정으로 이어받는다 */
export async function linkKakao(kakaoId: string, nickname: string, guest: number | null, remember: boolean): Promise<number> {
  return tx(async (q) => {
    const [had] = await q<{ id: number }>(`SELECT id FROM users WHERE kakao_id = $1`, [kakaoId]);
    // ponytail: 다른 기기의 둘러보기 기록은 이미 있는 계정에 합치지 않는다 (그 기기에 그대로 남음). 합치기는 요청이 있으면
    if (had) return had.id;
    const [g] = guest && guest !== config.USER_ID ? await q<{ id: number }>(`SELECT id FROM users WHERE id = $1 AND kakao_id IS NULL`, [guest]) : [];
    if (g) {
      // 브라우저 키는 떼어 낸다: 로그아웃하면 그 브라우저는 새 둘러보기 사용자가 된다
      await q(`UPDATE users SET kakao_id = $2, nickname = $3, remember = $4, agreed_at = now(), client_key = NULL WHERE id = $1`, [g.id, kakaoId, nickname, remember]);
      if (!remember) await q(`DELETE FROM memories WHERE user_id = $1`, [g.id]);
      return g.id;
    }
    const [u] = await q<{ id: number }>(`INSERT INTO users(nickname, kakao_id, remember, agreed_at) VALUES ($1,$2,$3,now()) RETURNING id`, [nickname, kakaoId, remember]);
    await q(`INSERT INTO characters(user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [u.id]);
    return u.id;
  });
}

export async function kakaoCallback(req: Request, res: Response) {
  const o = unseal<{ nonce: string; guest: number; remember: boolean; redirect: string }>(readCookie(req, OAUTH));
  res.clearCookie(OAUTH, { path: '/api/auth' });
  const code = req.query.code;
  if (!o || req.query.state !== o.nonce || typeof code !== 'string') return res.redirect('/?login=fail');
  try {
    const { kakaoId, nickname } = await kakaoProfile(code, o.redirect);
    const uid = await linkKakao(kakaoId, nickname, o.guest, o.remember);
    res.cookie(SESSION, seal({ uid, exp: Date.now() + SESSION_DAYS * DAY }), cookieOpts(req, SESSION_DAYS * DAY));
    res.redirect('/?login=ok');
  } catch (e) {
    console.warn('[login] 카카오 로그인 실패:', (e as Error).message);
    res.redirect('/?login=fail');
  }
}

export const logout = (res: Response) => res.clearCookie(SESSION, { path: '/' });

export async function me(userId: number, loggedIn: boolean) {
  const [u] = await query<{ nickname: string; remember: boolean }>(`SELECT nickname, remember FROM users WHERE id = $1`, [userId]);
  return { loggedIn, nickname: loggedIn ? u?.nickname : null, remember: !!u?.remember };
}

/** 닉네임(로그인 사용자만), [선택 동의] 대화 기록·기억 켜고 끄기. 끄면 기억은 바로 지운다 */
export async function updateMe(userId: number, loggedIn: boolean, b: any) {
  if (typeof b?.nickname === 'string') {
    const n = b.nickname.trim();
    if (!loggedIn || !n || n.length > 20) return { status: 400, body: { error: '닉네임은 1~20자로 적어 줘.' } };
    await query(`UPDATE users SET nickname = $2 WHERE id = $1`, [userId, n]);
  }
  if (typeof b?.remember === 'boolean') {
    await query(`UPDATE users SET remember = $2 WHERE id = $1`, [userId, b.remember]);
    if (!b.remember) await query(`DELETE FROM memories WHERE user_id = $1`, [userId]);
  }
  return { status: 200, body: await me(userId, loggedIn) };
}

/** 탈퇴: 계정과 모든 기록을 바로 지운다 */
export async function deleteAccount(userId: number) {
  await tx(async (q) => {
    await wipeRecords(q, userId);
    await q(`DELETE FROM characters WHERE user_id = $1`, [userId]);
    await q(`DELETE FROM users WHERE id = $1`, [userId]);
  });
  // ponytail: 카카오 "연결 끊기"는 하지 않는다(토큰을 저장하지 않아서). 필요하면 Admin 키로 v1/user/unlink
  return { deleted: true };
}

/** 보관 기간이 지난 것 지우기. 대화 원문: 선택 동의 켬 30일 / 끔 1일. 90일 안 쓴 둘러보기 사용자는 통째로 */
export async function purgeExpired() {
  const keep = `CASE WHEN u.remember THEN interval '30 days' ELSE interval '1 day' END`;
  const [m] = await query<{ n: number }>(
    `WITH d AS (DELETE FROM messages m USING chat_sessions s, users u
       WHERE m.session_id = s.id AND s.user_id = u.id AND m.created_at < now() - ${keep} RETURNING 1)
     SELECT count(*)::int AS n FROM d`,
  );
  await query(`UPDATE checkins c SET text = NULL FROM users u WHERE c.user_id = u.id AND c.text IS NOT NULL AND c.created_at < now() - ${keep}`);
  await query(`DELETE FROM memories m USING users u WHERE m.user_id = u.id AND NOT u.remember`);
  const idle = await query<{ id: number }>(
    `SELECT id FROM users WHERE kakao_id IS NULL AND id <> $1 AND last_seen < now() - interval '90 days'`,
    [config.USER_ID],
  );
  for (const { id } of idle) await deleteAccount(id);
  if (m.n || idle.length) console.log(`[privacy] 지난 대화 ${m.n}개, 쓰지 않은 둘러보기 사용자 ${idle.length}명 삭제`);
}
