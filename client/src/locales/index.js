import en from './en';
import fr from './fr';
import es from './es';
import ar from './ar';
import ha from './ha';
import yo from './yo';
import pt from './pt';

export const locales = { en, fr, es, ar, ha, yo, pt };

// Languages that display right-to-left
export const RTL_LANGUAGES = ['ar'];

// Language metadata for the picker UI
export const LANGUAGE_OPTIONS = [
  { code: 'en', nativeName: 'English',    flag: '🇬🇧' },
  { code: 'fr', nativeName: 'Français',   flag: '🇫🇷' },
  { code: 'es', nativeName: 'Español',    flag: '🇪🇸' },
  { code: 'ar', nativeName: 'العربية',    flag: '🇸🇦' },
  { code: 'ha', nativeName: 'Hausa',      flag: '🇳🇬' },
  { code: 'yo', nativeName: 'Yorùbá',     flag: '🇳🇬' },
  { code: 'pt', nativeName: 'Português',  flag: '🇧🇷' },
];

export default locales;
