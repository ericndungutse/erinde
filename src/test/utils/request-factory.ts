import request from 'supertest';
import app from '../../app.js';
import { ConstantValues } from '../../constants/constant.values.js';

export const TEST_LANG = process.env.TEST_LANG || ConstantValues.DEFAULT_LANGUAGE;

export const client = (defaultToken?: string, defaultLang = TEST_LANG) => ({
  post: (url: string, token = defaultToken, lang = defaultLang) => {
    const req = request(app).post(url).set('Accept-Language', lang);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  get: (url: string, token = defaultToken, lang = defaultLang) => {
    const req = request(app).get(url).set('Accept-Language', lang);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  patch: (url: string, token = defaultToken, lang = defaultLang) => {
    const req = request(app).patch(url).set('Accept-Language', lang);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
});
