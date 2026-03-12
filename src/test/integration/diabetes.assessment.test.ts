import { assert, beforeAll, describe, test } from "vitest";
import { setupTestDB } from "../utils/mongo-memory.js";
import { registerAccountsFromSetup } from "../testDataSetup/account-setup.js";
import User from "../../models/user.model.js";
import Account from "../../models/account.model.js";
import ClinicalProfile from "../../models/clinicalProfile.model.js";
import { createHospitalsFromSetup } from "../testDataSetup/hospital-setup.js";
import Hospital from "../../models/hospital.model.js";

// Initialize in-memory MongoDB for these tests
setupTestDB();

// Setup test data before running the tests
beforeAll(async () => {
  
//   // Setup accounts from account-setup.json
//   await registerAccountsFromSetup();

//   // Verify that accounts were created successfully
//   const createdUsers = await User.find({}).lean();
//   console.log("Created Users from account setup:", createdUsers);

//   // Check Account
//   const accounts = await Account.find({}).lean();
//   console.log("Created Accounts from account setup:", accounts);


//   // Checkout Clinical Profile was crated successfully
//   const clinicalProfiles = await ClinicalProfile.find({}).lean();
//   console.log("Created Clinical Profiles from account setup:", clinicalProfiles);
  // Setup accounts from account-setup.json
  await createHospitalsFromSetup();

  // Verify that accounts were created successfully
  const hospitals = await Hospital.find({}).lean();
  console.log("Created Hospitals from hospital setup:", hospitals);



});

describe("Diabetes Assessment: POST /api/v1/assessments", () => {
    test('should ', () => {
        
        assert(true, "Placeholder test - implement diabetes assessment tests here");
    });
});
