import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { AccessoryColorsProvider } from './AccessoryColors';
import { CharacterExpressionProvider } from './CharacterExpression';

createRoot(document.getElementById('root')!).render(<AccessoryColorsProvider><CharacterExpressionProvider><App /></CharacterExpressionProvider></AccessoryColorsProvider>);
