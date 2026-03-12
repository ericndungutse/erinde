import { beforeAll, beforeEach, describe } from 'vitest';
import { setupTestDB } from '../utils/mongo-memory.js';
import { seedAuthTestUsers } from '../utils/seed-auth-users.js';
import seedIndicators from '../../seed/seedIndicators.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

// Diabetes Normal body
const 



// beforeAll(async () => {
//   // seed indicators before running the tests
//   await seedIndicators();
// });

// beforeEach(async () => {
//   await seedAuthTestUsers();
// });

// Diabete integration test
describe('Diabetes Assessment: POST /api/v1/assessments', () => {
  // ============
  // Normal case
  // ============
  // No Rederal created
  // ============
  // Pre-diabetes: At Risk
  // ============
  // Referal created
  // ============
  // Possible Diabetes
  // ============
  // Referal created
});

describe('Hypertension Assessment: POST /api/v1/assessments', () => {
  // ============
  // Normal case
  // ============
  // No Rederal created
  // ============
  // Pre-hypertension: At Risk
  // ============
  // Referal created
  // ============
  // Possible Hypertension
  // ============
  // Referal created
});

describe('Obesity Assessment: POST /api/v1/assessments', () => {
  // ============
  // Normal case
  // ============
  // No Rederal created
  // ============
  // Overweight: At Risk
  // ============
  // Referal created
  // ============
  // Obese
  // ============
  // Referal created
});
