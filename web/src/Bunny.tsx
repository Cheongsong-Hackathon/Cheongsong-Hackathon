import mascot from './assets/mumu/home.webp';
import face from './assets/mumu/face.webp';
import cheerful from './assets/mumu/mood-happy.webp';
import useMumuAnimation, { type MumuMotion } from './useMumuAnimation';

type Props = {
  size?: number;
  happy?: boolean;
  peek?: boolean;
  faceOnly?: boolean;
  quiet?: boolean;
  motion?: MumuMotion | null;
  motionKey?: number;
  loopMotion?: boolean;
};

export default function Bunny({
  size = 200, happy = false, peek = false, faceOnly = false, quiet = false,
  motion = null, motionKey = 0, loopMotion = false,
}: Props) {
  const headOnly = faceOnly || peek;
  const animation = useMumuAnimation(quiet || headOnly ? null : motion, motionKey, loopMotion);

  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 205 225" width={size} height={size}
    className={`bunny mumu-character${quiet ? ' is-quiet' : ''}`} role="img"
    aria-label="무무">
    <g ref={animation.body} className={`mumu-action${motion ? ' mumu-action-' + motion : ''}`}>
      {headOnly
        ? <image href={face} width="205" height="225" preserveAspectRatio="xMidYMid meet" />
        : <image href={happy ? cheerful : mascot} x="5" y="5" width="195" height="215" preserveAspectRatio="xMidYMid meet" />}
    </g>
    {motion === 'heart' && !headOnly && <g ref={animation.hearts} aria-hidden="true">
      {[0, 1, 2].map(i => <path key={i} opacity="0" fill="#a17ae0" d="M0 8C-15-2-8-13 0-6C8-13 15-2 0 8Z" />)}
    </g>}
  </svg>;
}
