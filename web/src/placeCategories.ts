const LABELS:Record<string,string>={cafe:'카페',gallery:'전시/미술관',pottery:'원데이클래스',perfume:'원데이클래스',flower:'원데이클래스',drawing:'원데이클래스',candle:'원데이클래스',cookie:'원데이클래스',book:'책방',library:'도서관',park:'산책/자연',tea:'찻집',meditation:'명상',boardgame:'보드게임',karaoke:'노래방',climbing:'클라이밍',bowling:'볼링',camera:'사진'};
export function placeCategory(category:string){
 const key=category in LABELS?category:/카페/.test(category)?'cafe':/전시|미술/.test(category)?'gallery':/공방|클래스/.test(category)?'pottery':/산책|공원|자연/.test(category)?'park':/도서관/.test(category)?'library':/책/.test(category)?'book':category;
 return {key,label:LABELS[key]??category};
}
