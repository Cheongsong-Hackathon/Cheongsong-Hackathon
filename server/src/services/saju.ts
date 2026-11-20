import { z } from 'zod';

const elements = ['목', '화', '토', '금', '수'] as const;
type Element = typeof elements[number];
const stems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const branches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
const branchElements: readonly Element[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
const topics = { daily: '오늘의 흐름', love: '연애·관계', career: '진로·학업·일', choice: '선택·고민' } as const;
type Topic = keyof typeof topics;

const minute = 60_000;
const day = 86400000;
const kstOffset = 9 * 60 * minute;
const exactTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const birthSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^(?:unknown|[자축인묘진사오미신유술해]시?|(?:[01]\d|2[0-3]):[0-5]\d)$/).default('unknown'),
  calendarType: z.enum(['solar', 'lunar']).default('solar'),
  lunarLeapMonth: z.boolean().default(false),
  gender: z.enum(['male', 'female']),
  topic: z.enum(['daily', 'love', 'career', 'choice']).default('daily'),
});

const lunarCalendar = new Intl.DateTimeFormat('en-US-u-ca-dangi', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric',
});
const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

function lunarToSolar(year: number, month: number, lunarDay: number, leap: boolean) {
  const lunarMonth = `${month}${leap ? 'bis' : ''}`;
  for (let date = Date.UTC(year, 0, 1); date < Date.UTC(year + 1, 2, 1); date += day) {
    const parts = new Map<string, string>(lunarCalendar.formatToParts(date + 3 * 60 * minute)
      .map(part => [part.type, part.value]));
    if (Number(parts.get('relatedYear')) === year && parts.get('month') === lunarMonth && Number(parts.get('day')) === lunarDay) return date;
  }
  return null;
}

function solarLongitude(time: number) {
  // Local approximation from https://aa.usno.navy.mil/faq/sun_approx (about 1 arcminute).
  const daysSinceJ2000 = (time - Date.UTC(2000, 0, 1, 12)) / day;
  const anomaly = mod(357.529 + 0.98560028 * daysSinceJ2000, 360) * Math.PI / 180;
  return mod(280.459 + 0.98564736 * daysSinceJ2000 + 1.915 * Math.sin(anomaly) + 0.020 * Math.sin(2 * anomaly), 360);
}

function timeSlot(time: string) {
  if (time === 'unknown') return { minutes: 12 * 60, branch: null, tolerance: 0.55 };
  if (exactTime.test(time)) {
    const [hours, minutes] = time.split(':').map(Number);
    return { minutes: hours * 60 + minutes, branch: Math.floor((hours + 1) / 2) % 12, tolerance: 0.025 };
  }
  const branch = branches.findIndex(label => time === label || time === `${label}시`);
  return { minutes: branch * 120, branch, tolerance: 0.075 };
}

function pillar(stem: number, branch: number) {
  return { stem: stems[stem], branch: branches[branch], stemElement: elements[Math.floor(stem / 2)], branchElement: branchElements[branch] };
}

const dayMasterNotes = [
  '큰 나무처럼 방향을 세우고 한결같이 자라는 힘을 상징해요.',
  '풀과 덩굴처럼 주변에 맞추면서도 조금씩 자라는 힘을 상징해요.',
  '햇빛처럼 표현이 넓고 주변에 활기를 더하는 힘을 상징해요.',
  '촛불처럼 가까운 곳을 섬세하게 밝히고 집중하는 힘을 상징해요.',
  '산처럼 중심을 잡고 맡은 일을 오래 받치는 힘을 상징해요.',
  '밭처럼 작은 변화를 돌보고 꾸준히 키워내는 힘을 상징해요.',
  '단단한 쇠처럼 기준을 세우고 결단하는 힘을 상징해요.',
  '세공한 금속처럼 차이를 알아보고 정교하게 다듬는 힘을 상징해요.',
  '큰 물처럼 시야를 넓히고 다양한 흐름을 받아들이는 힘을 상징해요.',
  '이슬처럼 세심하게 관찰하고 조용히 스며드는 힘을 상징해요.',
] as const;

const elementEnergy: Record<Element, string> = { 목: '성장과 탐색', 화: '표현과 활력', 토: '안정과 돌봄', 금: '정리와 기준', 수: '관찰과 유연함' };
const topicAdvice: Record<Topic, (energy: string) => string> = {
  daily: energy => `오늘은 ${energy}에 시선을 두고, 부담 없이 마칠 수 있는 일 하나를 골라 보세요.`,
  love: energy => `관계에서 ${energy}이 어떤 모습으로 드러나는지 살펴보세요. 상대의 마음을 추측하기 전에 나의 바람을 한 문장으로 전해 보세요.`,
  career: energy => `${energy}을 살릴 수 있는 공부나 일을 한 가지 골라 시간을 정해 보세요. 끝낸 뒤 배운 점을 한 줄 적어 두면 다음 계획에 도움이 돼요.`,
  choice: energy => `${energy}을 기준으로 선택지를 살펴보세요. 각 선택에서 얻는 것과 감수할 것을 적어 보고, 되돌리기 쉬운 작은 시도부터 시작해 보세요.`,
};

export function analyzeSaju(payload: unknown, now = Date.now()) {
  const parsed = birthSchema.safeParse(payload);
  if (!parsed.success) return { error: '생년월일과 성별을 확인하고, 시간은 HH:mm, 시진 또는 unknown으로 입력해 주세요.' } as const;
  const input = parsed.data;
  const [year, month, date] = input.birthDate.split('-').map(Number);
  if (year < 1900 || year > 2099 || month < 1 || month > 12 || date < 1 || date > 31) {
    return { error: '1900–2099년 사이의 유효한 생년월일을 입력해 주세요.' } as const;
  }
  const calendarDate = Date.UTC(year, month - 1, date);
  const solar = input.calendarType === 'lunar' ? lunarToSolar(year, month, date, input.lunarLeapMonth)
    : (!input.lunarLeapMonth && new Date(calendarDate).toISOString().slice(0, 10) === input.birthDate ? calendarDate : null);
  if (solar === null) return { error: '존재하지 않는 날짜예요. 양력·음력과 윤달 선택을 확인해 주세요.' } as const;
  if (solar > Math.floor((now + kstOffset) / day) * day) return { error: '미래의 생년월일은 입력할 수 없어요.' } as const;

  const time = timeSlot(input.birthTime);
  const distanceFromSpring = mod(solarLongitude(solar + time.minutes * minute - kstOffset) - 315, 360);
  const monthIndex = Math.floor(distanceFromSpring / 30);
  const solarDate = new Date(solar);
  const pillarYear = solarDate.getUTCFullYear() - Number(solarDate.getUTCMonth() <= 1 && monthIndex >= 10);
  const yearStem = mod(pillarYear - 4, 10);
  const dayIndex = mod(40 + (solar - Date.UTC(2024, 1, 10)) / day, 60); // KASI 2024 역서: 2/10 갑진일
  const dayStem = dayIndex % 10;
  const pillars = {
    year: pillar(yearStem, mod(pillarYear - 4, 12)),
    month: pillar((2 * (yearStem % 5) + 2 + monthIndex) % 10, (monthIndex + 2) % 12),
    day: pillar(dayStem, dayIndex % 12),
    hour: time.branch === null ? null : pillar((2 * (dayStem % 5) + time.branch) % 10, time.branch),
  };
  const visibleSymbols = Object.values(pillars).flatMap(value => value ? [value.stemElement, value.branchElement] : []);
  const distribution = elements.map(element => {
    const count = visibleSymbols.filter(value => value === element).length;
    return { element, count, percentage: Math.round(1000 * count / visibleSymbols.length) / 10 };
  });
  const maxCount = Math.max(...distribution.map(row => row.count));
  const dominant = distribution.filter(row => row.count === maxCount).map(row => row.element);
  const lacking = distribution.filter(row => row.count === 0).map(row => row.element);
  const dayMaster = {
    stem: stems[dayStem],
    element: pillars.day.stemElement,
    summary: dayMasterNotes[dayStem],
  };
  const termDistance = distanceFromSpring % 30;
  const nearSolarTerm = Math.min(termDistance, 30 - termDistance) <= time.tolerance;
  return {
    input, solarBirthDate: solarDate.toISOString().slice(0, 10), pillars, dayMaster, nearSolarTerm,
    elements: { distribution, dominant, lacking, total: visibleSymbols.length },
    reading: { title: topics[input.topic], advice: topicAdvice[input.topic](elementEnergy[dayMaster.element]) },
  } as const;
}

export type SajuResult = Exclude<ReturnType<typeof analyzeSaju>, { error: string }>;
