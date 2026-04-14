import request from "supertest";
import { expect } from "vitest";
import app from "../../app.js";
import { logger } from "../../logger.js";

export async function loginByEmail(
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ identifier: email, password });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}

export async function loginByPhone(
  phone: string,
  password: string,
): Promise<string> {
  logger.info(`Logging in with phone: ${phone} and password: ${password}`);
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ identifier: phone, password });
  logger.debug(`Login response: ${JSON.stringify(res.body)}`);
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}
