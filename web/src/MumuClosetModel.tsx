import { useId } from 'react';
import { base, fullLook, type WardrobeItem } from './mumuWardrobeItems';

export type ClosetPreview = WardrobeItem | 'full' | null;
const frame = { width: 1122, height: 1402 };
const neckline = 'M0 806H210C275 861 335 885 420 881C550 879 685 859 778 821C849 791 894 756 923 713H1122V1402H0Z';

function ColorLayer({ id, alpha }: { id: string; alpha: string }) {
  return <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feColorMatrix values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 ${alpha}`} result="garment" />
    <feComposite in="garment" in2="SourceAlpha" operator="in" />
  </filter>;
}

export default function MumuClosetModel({ preview }: { preview: ClosetPreview }) {
  const id = useId();
  const item = preview === 'full' ? null : preview;
  const hoodie = item?.id === 'cloud-hoodie';
  const headset = item?.id === 'star-headset';
  const scarf = item?.id === 'yellow-scarf';
  const overalls = item?.id === 'cloud-overalls';
  const label = preview === 'full' ? '풀코디를 시착한 무무' : item ? `${item.name} 시착 중인 무무` : '옷장 무무';

  const clip = (name: string) => `url(#${id}-${name})`;

  return <svg viewBox="0 0 1122 1402" preserveAspectRatio="xMidYMax meet" role="img" aria-label={label}>
    <defs>
      {(hoodie || scarf || overalls) && <clipPath id={`${id}-neckline`}><path d={neckline} /></clipPath>}
      {headset && <>
        <clipPath id={`${id}-headset`}><rect x="107" y="270" width="866" height="495" /></clipPath>
        <clipPath id={`${id}-headset-stars`}>
          <rect x="132" y="541" width="122" height="157" />
          <rect x="894" y="457" width="73" height="147" />
        </clipPath>
        <ColorLayer id={`${id}-purple`} alpha="0 -15 15 0 -0.38" />
        <ColorLayer id={`${id}-yellow`} alpha="11 0 -11 0 -2.15" />
      </>}
      {scarf && <>
        <clipPath id={`${id}-scarf`}><rect x="240" y="728" width="631" height="390" /></clipPath>
        <ColorLayer id={`${id}-yellow`} alpha="11 0 -11 0 -2.15" />
      </>}
      {hoodie && <>
        <clipPath id={`${id}-hoodie-body`}>
          <path d="M149 1027Q168 910 277 848Q347 830 523 865Q721 876 858 824Q952 865 981 981L981 1402H149Z" />
        </clipPath>
        <clipPath id={`${id}-hoodie-neck`}>
          <path d="M255 883Q310 818 418 825L755 815Q848 826 886 909L829 955H281Z" />
        </clipPath>
        <linearGradient id={`${id}-hoodie-fabric`} x1=".15" x2=".85" y1=".03" y2="1">
          <stop stopColor="#c69bf5" />
          <stop offset=".55" stopColor="#b886ef" />
          <stop offset="1" stopColor="#a575dd" />
        </linearGradient>
        <ColorLayer id={`${id}-without-scarf`} alpha="-13 0 13 0 2.58" />
      </>}
    </defs>
    {/* 착용샷이 있는 아이템은 무무 그림을 통째로 바꾼다 */}
    <image href={preview === 'full' ? fullLook : item?.look ?? base} x={preview === 'full' ? -3 : 0}
      y={preview === 'full' ? 5 : 0} {...frame} />
    {item?.fit && !item.look && !hoodie && <g clipPath={overalls ? clip('neckline') : undefined}>
      <image href={item.image} {...item.fit} preserveAspectRatio="none" />
    </g>}
    {hoodie && item?.fit && <g clipPath={clip('neckline')}>
      {/* 풀착 그림의 소매·손·몸통을 쓰고, 가려진 목과 옷감만 보완합니다. */}
      <path d="M293 912Q385 889 539 917L524 1078Q498 1144 391 1132L282 1100Z" fill={clip('hoodie-fabric')} />
      <g clipPath={clip('hoodie-neck')}><image href={item.image} {...item.fit} preserveAspectRatio="none" /></g>
      <g transform="translate(-4 7)" clipPath={clip('hoodie-body')}>
        <image href={fullLook} {...frame} filter={clip('without-scarf')} />
      </g>
    </g>}
    {headset && <g transform="translate(1 22)">
      <image href={fullLook} {...frame} clipPath={clip('headset')} filter={clip('purple')} />
      <image href={fullLook} {...frame} clipPath={clip('headset-stars')} filter={clip('yellow')} />
    </g>}
    {scarf && <g clipPath={clip('neckline')}>
      <g transform="translate(6 116) scale(.995 .96)" clipPath={clip('scarf')}>
        <image href={fullLook} {...frame} filter={clip('yellow')} />
      </g>
    </g>}
  </svg>;
}
