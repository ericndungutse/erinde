import { describe, expect, it } from 'vitest';

import Hospital from '../../models/hospital.model.js';
import { createHospitalsFromSetup, HOSPITAL_SETUP } from '../testDataSetup/hospital-setup.js';
import { createNursesFromSetup, NURSE_SETUP } from '../testDataSetup/nurse-setup.js';
import { setupTestDB } from '../utils/mongo-memory.js';
import { Nurse } from '../../models/user.model.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

describe('Test Data Setup: nurses are attached to expected hospitals', () => {
  it('creates nurses linked to hospitals defined by fixture keys', async () => {
    const createdHospitalsKeys = await createHospitalsFromSetup();

    await createNursesFromSetup(createdHospitalsKeys);

    const createdNurses = await Nurse.find({})
      .populate('hospitalId')
      .lean();

    expect(createdNurses).toHaveLength(Object.keys(NURSE_SETUP).length);

    for (const [nurseSetupKey, nursePayload] of Object.entries(NURSE_SETUP)) {
      const hospitalSetupKey = nurseSetupKey.replace(/^NURSE_/, '');
      const expectedHospitalId = createdHospitalsKeys[hospitalSetupKey];
      const expectedHospitalName = HOSPITAL_SETUP[hospitalSetupKey]?.name;

      expect(expectedHospitalId).toBeDefined();
      expect(expectedHospitalName).toBeDefined();

      const createdNurse = createdNurses.find(
        (nurse) => nurse.contact.phone === nursePayload.contact.phone,
      );

      expect(createdNurse).toBeDefined();
      expect(createdNurse!.hospitalId).toBeDefined();

      const populatedHospital = createdNurse!.hospitalId as unknown as {
        _id: { toString(): string };
        name: string;
      };

      expect(populatedHospital._id.toString()).toBe(expectedHospitalId);
      expect(populatedHospital.name).toBe(expectedHospitalName);

      const hospitalInDb = await Hospital.findById(expectedHospitalId).lean();
      expect(hospitalInDb).toBeTruthy();
      expect(hospitalInDb!.name).toBe(expectedHospitalName);
    }
  });
});