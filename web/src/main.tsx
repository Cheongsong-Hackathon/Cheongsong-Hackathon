import { clearLegacyWardrobe } from './mumuWardrobeItems';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './journal.css';
import { CharacterExpressionProvider } from './CharacterExpression';

clearLegacyWardrobe();
createRoot(document.getElementById('root')!).render(<CharacterExpressionProvider><App /></CharacterExpressionProvider>);

import './mumu-design.css';

import './trip-design.css';

import './profile-nearby.css';

import './palette.css';

import './typography.css';

import './mumu-artwork.css';

import './mumu-flows.css';
import './mumu-room.css';
import './mumu-games.css';
