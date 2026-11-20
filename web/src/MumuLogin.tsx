import MumuArtwork from './MumuArtwork';
import {PhoneStatus} from './MumuWelcome';
import {KakaoConsent} from './Account';
// 회원가입은 카카오 하나만: 동의 → 카카오 로그인 → /?login=ok. 로그인 없이 둘러보기도 가능
export default function MumuLogin({onContinue,onBack}:{onContinue:()=>void;onBack:()=>void}){return <div className="mumu-login"><PhoneStatus/><button className="login-back" aria-label="첫 화면으로" onClick={onBack}>‹</button><MumuArtwork className="login-logo"/><h1>MUMU에 가입하고<br/>나만의 힐링 루틴을 시작해요!</h1><KakaoConsent onCancel={onContinue} cancelLabel="로그인 없이 둘러보기 →"/></div>;}
