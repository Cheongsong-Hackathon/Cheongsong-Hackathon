import type { ReactNode } from 'react';
import MumuGameHost from './MumuGameHost';

type SceneTheme = 'tarot' | 'balance' | 'words' | 'fortune';

export default function MumuGameScene({ theme, children, layout = 'center', tiles = false }: {
  theme: SceneTheme;
  children: ReactNode;
  layout?: 'center' | 'side';
  tiles?: boolean;
}) {
  return <div className={`game-hero game-scene game-scene--${theme} game-scene--${layout}`}>
    <div className="game-scene-art" aria-hidden="true">
      <i className="scene-clouds" />
      <i className="scene-star scene-star--left" /><i className="scene-star scene-star--right" />
      {theme === 'tarot' && <>
        <i className="tarot-room-window" /><i className="tarot-room-shelf" /><i className="tarot-room-table" />
      </>}
      {theme === 'fortune' && <>
        <i className="scene-moon" />
        <i className="scene-crystal" />
        <i className="scene-books"><b /><b /><b /></i>
      </>}
    </div>
    <p className="game-scene-bubble">{children}</p>
    <MumuGameHost />
    {tiles && <div className="word-scene-tiles" aria-hidden="true">
      <span>가</span><span>…</span><span>?</span>
    </div>}
  </div>;
}
