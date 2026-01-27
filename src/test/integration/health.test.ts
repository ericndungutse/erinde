import request from 'supertest';
import { describe, it, expect } from 'vitest';

import app from '../../app.js';

describe('Integration: GET /health', () => {
  it('should respond with 200 and status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
  });
});
