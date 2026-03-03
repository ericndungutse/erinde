import path from 'path';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as middleware from 'i18next-http-middleware';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'rw',
    preload: ['rw', 'en', 'fr'],
    backend: {
      loadPath: path.join(__dirname, 'locale/{{lng}}.json'),
    },
    detection: {
      order: ['querystring', 'header', 'cookie'],
      caches: false,
    },
  });

export default i18next;
