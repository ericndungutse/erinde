import request from 'supertest';
import { expect } from 'vitest';
import app from '../../app.js';

export async function loginByEmail(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ identifier: email, password });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}

export async function loginByPhone(phone: string, password: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ identifier: phone, password });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}
