import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mmdd, planMemoryOps } from '../src/services/memory.js';

const current = [
  { id: 1, kind: '취향' as const, text: '조용한 곳을 좋아함' },
  { id: 2, kind: '상황' as const, text: '이번 주 시험 기간' },
  { id: 3, kind: '사건' as const, text: '11/15 친구와 말다툼' },
];
const none = { add: [], update: [], remove: [] };

test('기억 변경 검사: 정상적인 추가·수정·삭제는 통과', () => {
  const p = planMemoryOps(current, { add: [{ kind: '취향', text: ' 노래 부르는 걸 좋아함 ' }], update: [{ id: 2, text: '시험 끝남' }], remove: [1] });
  assert.deepEqual(p, { add: [{ kind: '취향', text: '노래 부르는 걸 좋아함' }], update: [{ id: 2, text: '시험 끝남' }], remove: [1] });
});

test('기억 변경 검사: 위기·건강·연락처는 기억하지 않음 ("예약을"은 괜찮음)', () => {
  const add = (text: string) => planMemoryOps(current, { ...none, add: [{ kind: '상황', text }] }).add.length;
  assert.equal(add('요즘 죽고 싶다는 생각을 함'), 0);
  assert.equal(add('사는 게 의미가 없다고 느낌'), 0);
  assert.equal(add('우울증 진단을 받음'), 0);
  assert.equal(add('수면제 약 먹는 중'), 0);
  assert.equal(add('친구 번호 010-1234-5678'), 0);
  assert.equal(add('예약을 미루는 편'), 1);
});

test('기억 변경 검사: 없는 id, 이상한 종류, 중복, 너무 긴 글은 버림', () => {
  const p = planMemoryOps(current, {
    add: [
      { kind: '비밀', text: '이상한 종류' },
      { kind: '취향', text: '조용한 곳을 좋아함' }, // 이미 있음
      { kind: '취향', text: '조용한곳을 좋아함' }, // 띄어쓰기만 다름
      { kind: '취향', text: '가'.repeat(61) },
    ],
    update: [{ id: 99, text: '없는 기억' }],
    remove: [99],
  });
  assert.deepEqual(p, none);
});

test('기억 변경 검사: 최대 개수를 넘기지 않음 (지운 만큼은 자리가 생김)', () => {
  const add = [1, 2, 3].map((i) => ({ kind: '취향', text: `좋아하는 것 ${i}` }));
  assert.equal(planMemoryOps(current, { ...none, add }, 4).add.length, 1); // 3개 있음 → 1자리
  assert.equal(planMemoryOps(current, { ...none, add, remove: [1] }, 4).add.length, 2);
});

test('날짜는 한국 시간 기준 "월/일"', () => {
  assert.equal(mmdd('2026-11-16T15:30:00Z'), '11/17'); // UTC 15:30 = 한국 다음 날 00:30
});

test('기억 변경 검사: 사건 기억은 AI가 지울 수 없음 (고치기는 가능)', () => {
  assert.deepEqual(planMemoryOps(current, { ...none, remove: [3] }).remove, []);
  assert.deepEqual(planMemoryOps(current, { ...none, update: [{ id: 3, text: '11/15 친구와 다퉜다가 화해함' }] }).update.length, 1);
});