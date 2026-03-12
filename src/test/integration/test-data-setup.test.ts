import { describe, expect, it } from 'vitest';

import Account from '../../models/account.model.js';
import Hospital from '../../models/hospital.model.js';
import User, { Nurse } from '../../models/user.model.js';
import { ACCOUNT_SETUP } from '../testDataSetup/account-setup.js';
import { HOSPITAL_SETUP } from '../testDataSetup/hospital-setup.js';
import { NURSE_SETUP } from '../testDataSetup/nurse-setup.js';
import { setupTestData } from '../testDataSetup/index.js';
import { setupTestDB } from '../utils/mongo-memory.js';
import { UserRole } from '../../types/roles.types.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

describe('Test Data Setup Orchestrator: setupTestData()', () => {
  it('orchestrates setup of accounts, hospitals, and nurses with complete verification', async () => {
    const result = await setupTestData();

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.createdHospitals).toBeDefined();
    expect(typeof result.createdHospitals).toBe('object');

    // Verify all expected hospital keys are present
    const expectedHospitalSetupKeys = Object.keys(HOSPITAL_SETUP);
    const createdHospitalKeys = Object.keys(result.createdHospitals);
    expect(createdHospitalKeys.sort()).toEqual(expectedHospitalSetupKeys.sort());

    // Verify accounts created
    const createdAccounts = await Account.find({}).lean();
    const accountCount = Object.keys(ACCOUNT_SETUP).length;
    expect(createdAccounts.length).toBeGreaterThanOrEqual(accountCount);

    for (const [accountSetupKey, accountPayload] of Object.entries(ACCOUNT_SETUP)) {
      const createdAccount = await Account.findOne({
        phoneNumber: accountPayload.contact.phone,
      }).lean();

      expect(createdAccount).toBeTruthy();
      expect(createdAccount!.phoneNumber).toBe(accountPayload.contact.phone);

      // Verify user was created with correct roles
      const user = await User.findOne({
        'contact.phone': accountPayload.contact.phone,
      }).lean();

      expect(user).toBeTruthy();
      expect(user!.roles).toContain(UserRole.USER);
      for (const role of accountPayload.roles) {
        expect(user!.roles).toContain(role);
      }
    }

    // Verify hospitals created
    const createdHospitals = await Hospital.find({}).lean();
    const hospitalCount = Object.keys(HOSPITAL_SETUP).length;
    expect(createdHospitals).toHaveLength(hospitalCount);

    for (const [hospitalSetupKey, hospitalPayload] of Object.entries(HOSPITAL_SETUP)) {
      const createdHospital = await Hospital.findOne({
        name: hospitalPayload.name,
      }).lean();

      expect(createdHospital).toBeTruthy();
      expect(createdHospital!.name).toBe(hospitalPayload.name);
      expect(result.createdHospitals[hospitalSetupKey]).toBe(
        createdHospital!._id.toString(),
      );
    }

    // Verify nurses created and linked to hospitals
    const createdNurses = await Nurse.find({})
      .populate('hospitalId')
      .lean();
    const nurseCount = Object.keys(NURSE_SETUP).length;
    expect(createdNurses).toHaveLength(nurseCount);

    for (const [nurseSetupKey, nursePayload] of Object.entries(NURSE_SETUP)) {
      const createdNurse = await Nurse.findOne({
        'contact.phone': nursePayload.contact.phone,
      })
        .populate('hospitalId')
        .lean();

      expect(createdNurse).toBeTruthy();
      expect(createdNurse!.roles).toContain(UserRole.NURSE);

      const hospitalSetupKey = nurseSetupKey.replace(/^NURSE_/, '');
      const expectedHospitalId = result.createdHospitals[hospitalSetupKey];

      expect(createdNurse!.hospitalId).toBeDefined();
      const populatedHospital = createdNurse!.hospitalId as unknown as {
        _id: { toString(): string };
        name: string;
      };
      expect(populatedHospital._id.toString()).toBe(expectedHospitalId);
      expect(populatedHospital.name).toBe(HOSPITAL_SETUP[hospitalSetupKey]?.name);
    }
  });
});
