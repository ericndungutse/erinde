import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../../logger.js";

type Address = {
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
};

type UserFixture = {
  _id: string;
  roles: string[];
  address: Address;
  communityHealthUnit?: string;
};

type ClinicalProfileFixture = {
  _id: string;
  userId: string;
  patientNumber: number;
};

type CommunityHealthUnitFixture = {
  _id: string;
  address: Address;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadJson<T>(filename: string): T {
  const filePath = resolve(__dirname, "reads", filename);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function addressKey(address: Address): string {
  return [
    address.province,
    address.district,
    address.sector,
    address.cell,
    address.village,
  ].join("|");
}

describe("Read fixtures consistency", () => {
  const users = loadJson<UserFixture[]>("erinde_dev.users.json");
  const clinicalProfiles = loadJson<ClinicalProfileFixture[]>(
    "erinde_dev.clinicalprofiles.json",
  );
  const communityHealthUnits = loadJson<CommunityHealthUnitFixture[]>(
    "erinde_dev.communityhealthunits.json",
  );

  const communityHealthUnitById = new Map(
    communityHealthUnits.map((communityHealthUnit) => [
      communityHealthUnit._id,
      communityHealthUnit,
    ]),
  );

  const userById = new Map(users.map((user) => [user._id, user]));

  it("ensures users reference existing community health units", () => {
    const usersWithMissingCommunityHealthUnit = users
      .filter((user) => user.communityHealthUnit != null)
      .filter((user) => !communityHealthUnitById.has(user.communityHealthUnit!))
      .map((user) => user._id);

    expect(usersWithMissingCommunityHealthUnit).toEqual([]);
  });

  it("ensures clinical profiles reference existing users", () => {
    const clinicalProfilesWithMissingUser = clinicalProfiles
      .filter((clinicalProfile) => !userById.has(clinicalProfile.userId))
      .map((clinicalProfile) => clinicalProfile._id);

    expect(clinicalProfilesWithMissingUser).toEqual([]);
  });

  it("ensures CHU-linked users have exactly one clinical profile and matching CHU address", () => {
    const profileCountByUserId = new Map<string, number>();
    for (const clinicalProfile of clinicalProfiles) {
      const currentCount =
        profileCountByUserId.get(clinicalProfile.userId) ?? 0;
      profileCountByUserId.set(clinicalProfile.userId, currentCount + 1);
    }

    const errors: string[] = [];

    for (const user of users) {
      if (user.communityHealthUnit == null) {
        continue;
      }

      const communityHealthUnit = communityHealthUnitById.get(
        user.communityHealthUnit,
      );
      if (!communityHealthUnit) {
        continue;
      }

      if (
        addressKey(user.address) !== addressKey(communityHealthUnit.address)
      ) {
        errors.push(`Address mismatch for user ${user._id}`);
      }

      const profileCount = profileCountByUserId.get(user._id) ?? 0;
      if (profileCount !== 1) {
        errors.push(
          `Expected exactly 1 clinical profile for user ${user._id}, got ${profileCount}`,
        );
      }
    }

    expect(errors).toEqual([]);
  });

  it("ensures exactly 3 USER-only users per community health unit", () => {
    const userOnlyUsers = users.filter(
      (user) =>
        user.communityHealthUnit != null &&
        user.roles.length === 1 &&
        user.roles[0] === "USER",
    );

    logger.info(
      { userOnlyUsersCount: userOnlyUsers.length },
      "Total USER-only users linked to CHUs",
    );
    const countByCommunityHealthUnitId = new Map<string, number>();
    for (const user of userOnlyUsers) {
      const communityHealthUnitId = user.communityHealthUnit!;
      const currentCount =
        countByCommunityHealthUnitId.get(communityHealthUnitId) ?? 0;
      countByCommunityHealthUnitId.set(communityHealthUnitId, currentCount + 1);
    }

    logger.info(
      { countByCommunityHealthUnitId },
      "Count of USER-only users per community health unit",
    );

    const actualCounts = Object.fromEntries(
      communityHealthUnits.map((communityHealthUnit) => [
        communityHealthUnit._id,
        countByCommunityHealthUnitId.get(communityHealthUnit._id) ?? 0,
      ]),
    );

    logger.info(
      { actualCounts },
      "Actual counts of USER-only users per community health unit",
    );

    const expectedCounts = Object.fromEntries(
      communityHealthUnits.map((communityHealthUnit) => [
        communityHealthUnit._id,
        countByCommunityHealthUnitId.get(communityHealthUnit._id),
      ]),
    );

    expect(actualCounts).toEqual(expectedCounts);
  });

  it("ensures clinical profile patient numbers are unique", () => {
    const patientNumbers = clinicalProfiles.map(
      (clinicalProfile) => clinicalProfile.patientNumber,
    );
    const uniquePatientNumbers = new Set(patientNumbers);

    expect(uniquePatientNumbers.size).toBe(patientNumbers.length);
  });
});
