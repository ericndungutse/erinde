import { describe, expect, it } from 'vitest';

import Account from '../../models/account.model.js';
import CommunityHealthUnit from '../../models/communitHealthUnit.model.js';
import Hospital from '../../models/hospital.model.js';
import User, { Nurse } from '../../models/user.model.js';
import { ACCOUNT_SETUP } from './account-setup.js';
import { COMMUNIT_HEALTH_UNIT_SETUP } from './communit-health-unit-setup.js';
import { HOSPITAL_SETUP } from './hospital-setup.js';
import { NURSE_SETUP } from './nurse-setup.js';
import { setupTestData } from './index.js';
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

      expect(user!.communityHealthUnit).toBeDefined();
      const linkedCommunitHealthUnit = await CommunityHealthUnit.findById(
        user!.communityHealthUnit,
      ).lean();
      expect(linkedCommunitHealthUnit).toBeTruthy();

      const expectedCommunitHealthUnitSetup = Object.entries(
        COMMUNIT_HEALTH_UNIT_SETUP,
      ).find(([, communitHealthUnitPayload]) => (
        communitHealthUnitPayload.socialHealthWorkerSetupKey === accountSetupKey
      ));

      if (expectedCommunitHealthUnitSetup) {
        const [, communitHealthUnitPayload] = expectedCommunitHealthUnitSetup;
        expect(linkedCommunitHealthUnit!.address.village).toBe(
          communitHealthUnitPayload.address.village.toLowerCase(),
        );
      }

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
        name: hospitalPayload.name.toLowerCase(),
      }).lean();

      expect(createdHospital).toBeTruthy();
      expect(createdHospital!.name).toBe(hospitalPayload.name.toLowerCase());
      expect(result.createdHospitals[hospitalSetupKey]).toBe(
        createdHospital!._id.toString(),
      );
    }

    // Verify community health units created and linked to expected health centers
    const createdCommunitHealthUnits = await CommunityHealthUnit.find({}).lean();
    const communitHealthUnitCount = Object.keys(COMMUNIT_HEALTH_UNIT_SETUP).length;
    expect(createdCommunitHealthUnits).toHaveLength(communitHealthUnitCount);

    for (const [communitHealthUnitSetupKey, communitHealthUnitPayload] of Object.entries(COMMUNIT_HEALTH_UNIT_SETUP)) {
      const createdCommunitHealthUnit = await CommunityHealthUnit.findOne({
        'address.province': communitHealthUnitPayload.address.province.toLowerCase(),
        'address.district': communitHealthUnitPayload.address.district.toLowerCase(),
        'address.sector': communitHealthUnitPayload.address.sector.toLowerCase(),
        'address.cell': communitHealthUnitPayload.address.cell.toLowerCase(),
        'address.village': communitHealthUnitPayload.address.village.toLowerCase(),
      }).lean();

      expect(createdCommunitHealthUnit).toBeTruthy();

      const expectedHealthCenterId = result.createdHospitals[
        communitHealthUnitPayload.healthCenterSetupKey
      ];
      expect(expectedHealthCenterId).toBeDefined();
      expect(createdCommunitHealthUnit!.healthCenter.toString()).toBe(expectedHealthCenterId);
      if (createdCommunitHealthUnit!.name) {
        expect(createdCommunitHealthUnit!.name).toBe(
          `${communitHealthUnitPayload.address.village}-${communitHealthUnitPayload.address.cell}`.toLowerCase(),
        );
      }

      const linkedHealthCenter = await Hospital.findById(
        createdCommunitHealthUnit!.healthCenter,
      ).lean();
      expect(linkedHealthCenter).toBeTruthy();
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
      expect(createdNurse!.communityHealthUnit).toBeDefined();
      const populatedHospital = createdNurse!.hospitalId as unknown as {
        _id: { toString(): string };
        name: string;
      };
      expect(populatedHospital._id.toString()).toBe(expectedHospitalId);
      expect(populatedHospital.name).toBe(HOSPITAL_SETUP[hospitalSetupKey]?.name?.toLowerCase());

      const nurseCommunityHealthUnit = await CommunityHealthUnit.findById(
        createdNurse!.communityHealthUnit,
      ).lean();
      expect(nurseCommunityHealthUnit).toBeTruthy();
    }
  });
});
