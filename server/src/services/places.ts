import { config } from '../config.js';
import { query } from '../db.js';
import { haversineM, type LatLng } from '../geo.js';

export type Place = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  isPartner: boolean;
  openHours: { open: string; close: string } | null;
  note: string | null;
  distanceM?: number;
};
export type PartnerPlace = Place & { partnerId: number; couponPolicy: string };

/** 장소 저장소. 나중에 우리 지도 DB(전용 테이블, 카카오 로컬 API 등) 구현체로 갈아 끼운다. */
export interface PlaceRepository {
  findNearby(center: LatLng, radiusM: number): Promise<Place[]>;
  findById(id: string): Promise<Place | null>;
  listPartners(): Promise<PartnerPlace[]>;
}

const COLS = `p.id, p.name, p.category, p.lat, p.lng, p.is_partner AS "isPartner", p.open_hours AS "openHours", p.note`;

/** 지금 쓰는 구현체: PostgreSQL places 테이블 (seed 6곳) */
export class PgPlaceRepository implements PlaceRepository {
  // ponytail: 전체를 읽어 하버사인으로 거른다. 장소가 수천 곳을 넘으면 PostGIS ST_DWithin으로.
  async findNearby(center: LatLng, radiusM: number) {
    const rows = await query<Place>(`SELECT ${COLS} FROM places p`);
    return rows
      .map((p) => ({ ...p, distanceM: Math.round(haversineM(center, p)) }))
      .filter((p) => p.distanceM <= radiusM)
      .sort((a, b) => a.distanceM - b.distanceM);
  }
  async findById(id: string) {
    const [p] = await query<Place>(`SELECT ${COLS} FROM places p WHERE p.id = $1`, [id]);
    return p ?? null;
  }
  listPartners() {
    return query<PartnerPlace>(
      `SELECT ${COLS}, pt.id AS "partnerId", pt.coupon_policy AS "couponPolicy"
       FROM partners pt JOIN places p ON p.id = pt.place_id ORDER BY pt.id`,
    );
  }
}

export function isOpen(hours: Place['openHours'], now = new Date()): boolean {
  if (!hours) return true;
  const hhmm = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
  return hours.open <= hhmm && hhmm < hours.close;
}

export class PlaceService {
  constructor(private repo: PlaceRepository) {}
  /** 반경 안에서 지금 영업 중인 곳 (DEMO_MODE에서는 영업시간을 따지지 않는다) */
  async openNearby(center: LatLng, now = new Date()) {
    const places = await this.repo.findNearby(center, config.SEARCH_RADIUS_M);
    return config.demoMode ? places : places.filter((p) => isOpen(p.openHours, now));
  }
}

export const placeRepo: PlaceRepository = new PgPlaceRepository();
export const placeService = new PlaceService(placeRepo);
