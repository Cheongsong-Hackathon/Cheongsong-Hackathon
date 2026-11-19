import MumuDesignPreview from './MumuDesignPreview';
import { MumuWardrobeProvider } from './MumuWardrobe';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './typography.css';
import './journal.css';
import { AccessoryColorsProvider } from './AccessoryColors';
import { CharacterExpressionProvider } from './CharacterExpression';

createRoot(document.getElementById('root')!).render(<MumuWardrobeProvider><AccessoryColorsProvider><CharacterExpressionProvider>{import.meta.env.DEV && new URLSearchParams(window.location.search).has('characterPreview') ? <MumuDesignPreview /> : <App />}</CharacterExpressionProvider></AccessoryColorsProvider></MumuWardrobeProvider>);
