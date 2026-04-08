import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type OidRef = {
  $oid: string;
};

type Address = {
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
};

type UserFixture = {
  _id: OidRef;
  roles: string[];
  address: Address;
  communityHealthUnit?: OidRef;
};

type ClinicalProfileFixture = {
  _id: OidRef;
  userId: OidRef;
  patientNumber: number;
};

type CommunityHealthUnitFixture = {
  _id: OidRef;
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
      communityHealthUnit._id.$oid,
      communityHealthUnit,
    ]),
  );

  const userById = new Map(users.map((user) => [user._id.$oid, user]));

  it("ensures users reference existing community health units", () => {
    const usersWithMissingCommunityHealthUnit = users
      .filter((user) => user.communityHealthUnit != null)
      .filter(
        (user) => !communityHealthUnitById.has(user.communityHealthUnit!.$oid),
      )
      .map((user) => user._id.$oid);

    expect(usersWithMissingCommunityHealthUnit).toEqual([]);
  });

  it("ensures clinical profiles reference existing users", () => {
    const clinicalProfilesWithMissingUser = clinicalProfiles
      .filter((clinicalProfile) => !userById.has(clinicalProfile.userId.$oid))
      .map((clinicalProfile) => clinicalProfile._id.$oid);

    expect(clinicalProfilesWithMissingUser).toEqual([]);
  });

  it("ensures CHU-linked users have exactly one clinical profile and matching CHU address", () => {
    const profileCountByUserId = new Map<string, number>();
    for (const clinicalProfile of clinicalProfiles) {
      const currentCount =
        profileCountByUserId.get(clinicalProfile.userId.$oid) ?? 0;
      profileCountByUserId.set(clinicalProfile.userId.$oid, currentCount + 1);
    }

    const errors: string[] = [];

    for (const user of users) {
      if (user.communityHealthUnit == null) {
        continue;
      }

      const communityHealthUnit = communityHealthUnitById.get(
        user.communityHealthUnit.$oid,
      );
      if (!communityHealthUnit) {
        continue;
      }

      if (
        addressKey(user.address) !== addressKey(communityHealthUnit.address)
      ) {
        errors.push(`Address mismatch for user ${user._id.$oid}`);
      }

      const profileCount = profileCountByUserId.get(user._id.$oid) ?? 0;
      if (profileCount !== 1) {
        errors.push(
          `Expected exactly 1 clinical profile for user ${user._id.$oid}, got ${profileCount}`,
        );
      }
    }

    expect(errors).toEqual([]);
  });

  it("ensures exactly 10 USER-only users per community health unit", () => {
    const userOnlyUsers = users.filter(
      (user) =>
        user.communityHealthUnit != null &&
        user.roles.length === 1 &&
        user.roles[0] === "USER",
    );

    const countByCommunityHealthUnitId = new Map<string, number>();
    for (const user of userOnlyUsers) {
      const communityHealthUnitId = user.communityHealthUnit!.$oid;
      const currentCount =
        countByCommunityHealthUnitId.get(communityHealthUnitId) ?? 0;
      countByCommunityHealthUnitId.set(communityHealthUnitId, currentCount + 1);
    }

    const actualCounts = Object.fromEntries(
      communityHealthUnits.map((communityHealthUnit) => [
        communityHealthUnit._id.$oid,
        countByCommunityHealthUnitId.get(communityHealthUnit._id.$oid) ?? 0,
      ]),
    );

    const expectedCounts = Object.fromEntries(
      communityHealthUnits.map((communityHealthUnit) => [
        communityHealthUnit._id.$oid,
        10,
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
