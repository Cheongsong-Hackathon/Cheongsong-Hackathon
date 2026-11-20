import logo from './assets/mumu/logo.webp';
import home from './assets/mumu/home.webp';
import explore from './assets/mumu/explore.webp';
import community from './assets/mumu/community.webp';
const art={logo,home,explore,community};
// Render the complete original PNG, including its transparent margins.
export default function MumuArtwork({kind='logo',className='',label='무무'}:{kind?:keyof typeof art;className?:string;label?:string}){return <img className={`mumu-artwork ${className}`} src={art[kind]} alt={label} draggable={false}/>;}
export function MumuLoading({message='잠시만 기다려 주세요'}:{message?:string}){return <div className="mumu-loading" role="status" aria-live="polite"><MumuArtwork className="mumu-loading-logo"/><p>{message}</p><span className="mumu-loading-dots" aria-hidden="true">● ● ●</span></div>;}
