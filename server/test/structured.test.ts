import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CheckinOut } from '../src/services/checkin.js';
import { OpenAICompatClient, strictJsonSchema } from '../src/services/llm.js';

const base = { baseUrl: 'https://example.test/v1', model: 'm', apiKey: 'k' };

test('응답 형식 강제: 켠 공급자에게만 json_schema를 보내고, 공급자 전용 옵션을 더함', () => {
  const schema = strictJsonSchema(CheckinOut);
  const plain = new OpenAICompatClient('gemini', base).body('sys', 'user', schema);
  assert.equal('response_format' in plain, false); // Gemini처럼 끄면 지금과 같은 요청

  const clova = new OpenAICompatClient('clova', { ...base, structured: true, extra: { reasoning_effort: 'none' } }).body('sys', 'user', schema);
  assert.deepEqual(clova.response_format, { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema } });
  assert.equal((clova as any).reasoning_effort, 'none');
});

test('zod → 엄격한 JSON 스키마: 위험도 선택지 유지, $schema·default 제거, 정의 밖 필드 금지', () => {
  const s = strictJsonSchema(CheckinOut) as any;
  assert.equal(s.$schema, undefined);
  assert.equal(s.additionalProperties, false);
  assert.deepEqual(s.required, ['reply', 'risk']);
  assert.deepEqual(s.properties.risk.enum, ['NONE', 'WATCH', 'CRISIS']);
  assert.equal(s.properties.reply.default, undefined);
});
