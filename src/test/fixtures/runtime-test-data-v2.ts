import i18next from "../../i18n.js";
import { TEST_LANG } from "../utils/request-factory.js";

export const existingPatientsTestData = {
  "rutenga-one": {
    _id: "69c50f44fd585f2834d4144f",
    firstname: "Rutenga",
    lastname: "One",
    birthdate: "1986-05-04T00:00:00.000Z",
    address: {
      province: "south",
      district: "muhanga",
      sector: "nyamabuye",
      cell: "gahogo",
      village: "rutenga",
    },
    contact: {
      phone: "0788558877",
    },
    nationalIdentificationNumber: "1198680548987458",
    roles: ["USER"],
    communityHealthUnit: "69c50baefd585f2834d413e6",
    patientNumber: 4,
  },

  "rutenga-two": {
    _id: "69c50f85fd585f2834d41459",
    firstname: "Rutenga",
    lastname: "Two",
    birthdate: "1981-11-11T00:00:00.000Z",
    address: {
      province: "south",
      district: "muhanga",
      sector: "nyamabuye",
      cell: "gahogo",
      village: "rutenga",
    },
    contact: {
      phone: "0788554411",
    },
    nationalIdentificationNumber: "1198187896547754",
    roles: ["USER"],
    communityHealthUnit: "69c50baefd585f2834d413e6",
    patientNumber: 5,
  },
  "murambi-one": {
    _id: "69c65c705f971826eb544cac",
    firstname: "Murambi",
    lastname: "One",
    birthdate: "1996-07-03T00:00:00.000Z",
    address: {
      province: "south",
      district: "muhanga",
      sector: "shyogwe",
      cell: "ruli",
      village: "murambi",
    },
    contact: {
      phone: "0788447744",
    },
    nationalIdentificationNumber: "1199687489625785",
    roles: ["USER"],
    communityHealthUnit: "69c50c53fd585f2834d41410",
    patientNumber: 6,
  },
};

export const nonExistingPatientsTestData = {
  "rutenga-non-existing-one": {
    firstname: "Rutenga",
    lastname: "NonExisting",
    birthdate: "1990-01-01T00:00:00.000Z",
    address: {
      province: "south",
      district: "muhanga",
      sector: "nyamabuye",
      cell: "gahogo",
      village: "rutenga",
    },
    contact: {
      phone: "0788999911",
    },
    nationalIdentificationNumber: "1199000100001111",
  },
};

export const existingSHWTestData = {
  "rutenga-SHW": {
    user: {
      id: "69c50baffd585f2834d413e9",
      firstname: "Rutenga",
      lastname: "SHW",
      phone: "0785283007",
      nationalId: "1199580168436061",
      roles: ["USER", "SOCIAL_HEALTH_WORKER"],
    },
    credentials: {
      phoneNumber: "0785283007",
      password: "Test@123",
    },
  },

  "murambi-SHW": {
    user: {
      id: "69c50c53fd585f2834d41413",
      firstname: "Murambi",
      lastname: "SHW",
      phone: "0785283008",
      nationalId: "1199480168436061",
      roles: ["USER", "SOCIAL_HEALTH_WORKER"],
    },
    credentials: {
      phoneNumber: "0785283008",
      password: "Test@123",
    },
  },
};

export const existingNurseTestData = {
  "kabwayi-HC-NURSE": {
    _id: "69db982b425b55936ee1e229",
    user: {
      id: "69db982b425b55936ee1e229",
      firstname: "NURSE",
      lastname: "KABWAYI HC",
      phone: "0785283009",
      nationalId: "0000000000000001",
      roles: ["USER", "NURSE"],
      role: "Nurse",
    },
    credentials: {
      phoneNumber: "0785283009",
      password: "Test@123",
    },
    communityHealthUnitId: "69c50baefd585f2834d413e6",
    hospitalId: "69c50941fd585f2834d413cf",
  },
};

export const existingCHUTestData = {
  "rutenga-CHU": {
    id: "69c50baefd585f2834d413e6",
    name: "rutenga-gahogo",
    socialHealthWorkerId: "69c50baffd585f2834d413e9",
    address: {
      province: "south",
      district: "muhanga",
      sector: "nyamabuye",
      cell: "gahogo",
      village: "rutenga",
    },
  },

  "murambi-CHU": {
    id: "69c50c53fd585f2834d41410",
    name: "murambi-ruli",
    socialHealthWorkerId: "69c50c53fd585f2834d41413",
    address: {
      province: "south",
      district: "muhanga",
      sector: "shyogwe",
      cell: "ruli",
      village: "murambi",
    },
  },
};

export const existingHospitalTestData = {};

export const existingIndicatorTestData = {
  diabetes: {
    _id: "69c14efbc61b8609c351181b",
    name: "diabetes",
    readings: [
      {
        type: "random_blood_glucose",
        unit: "mg/dL",
      },
    ],
    classifications: [
      {
        status_code: "critical",
        label: "Possible Diabetes",
        min_value: 200,
        recommendations: [
          "Irinde ibinyobwa birimo isukari nyinshi",
          "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
        ],
      },
      {
        status_code: "warning",
        label: "Pre-diabetes: At Risk",
        min_value: 140,
        max_value: 199.9,
        recommendations: [
          "Gabanya ibiryo n'ibinyobwa birimo isukari",
          "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
        ],
      },
      {
        status_code: "healthy",
        label: "Normal",
        max_value: 139.9,
        recommendations: [
          "Komeza kurya indyo yuzuye",
          "Komeza gukora imyitozo ngororamubiri buri gihe",
        ],
      },
    ],
  },
  hypertenssion: {
    _id: "69c14efbc61b8609c351181a",
    name: "hypertension",
    readings: [
      {
        type: "systolic_blood_pressure",
        unit: "mmHg",
      },
      {
        type: "diastolic_blood_pressure",
        unit: "mmHg",
      },
    ],
    classifications: [
      {
        status_code: "critical",
        label: "Hypertensive Crisis",
        min_systolic: 180,
        min_diastolic: 120,
        logic: "OR",
        recommendations: [
          "Gana ivuriro ryihuse bitarenze uyu munsi",
          "Gabanya umunyu kandi urye indyo yuzuye",
          "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
        ],
      },
      {
        status_code: "danger",
        label: "Likely Hypertension Stage 2",
        min_systolic: 160,
        min_diastolic: 100,
        logic: "OR",
        recommendations: [
          "Rya neza kandi ukore imyitozo ngororamubiri buri munsi",
          "Irinde itabi n'inzoga nyinshi",
          "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
        ],
      },
      {
        status_code: "danger",
        label: "Likely Hypertension Stage 1",
        min_systolic: 140,
        min_diastolic: 90,
        logic: "OR",
        recommendations: [
          "Wongere imyitozo ngororamubiri",
          "Gabanya ibiryo birimo umunyu mwinshi n'ibinure",
          "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
        ],
      },
      {
        status_code: "warning",
        label: "Elevated",
        min_systolic: 120,
        min_diastolic: 80,
        logic: "OR",
        recommendations: [
          "Gabanya umunyu kandi urye imbuto n'imboga nyinshi",
          "Kora imyitozo ngororamubiri kandi wirinde imihangayiko",
          "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
        ],
      },
      {
        status_code: "healthy",
        label: "Normal",
        max_systolic: 119,
        max_diastolic: 79,
        logic: "AND",
        recommendations: [
          "Komeza ubuzima bwiza urimo",
          "Komeza kwisuzumisha uko ubishishikarijwe n'abaganga",
        ],
      },
    ],
  },
  bmi: {
    _id: "69c14efbc61b8609c351181c",
    name: "bmi",
    readings: [
      {
        type: "height",
        unit: "cm",
      },
      {
        type: "weight",
        unit: "kg",
      },
    ],
    classifications: [
      {
        status_code: "danger",
        label: "Obesity Class III",
        min_value: 40,
        recommendations: [
          "Shaka inama z'abaganga kugira ngo ugabanye ibiro mu buryo burambye",
        ],
      },
      {
        status_code: "danger",
        label: "Obesity Class II",
        min_value: 35,
        max_value: 39.9,
        recommendations: [
          "Gabanya igihe umara nicaye, wongere imyitozo ngororamubiri",
        ],
      },
      {
        status_code: "danger",
        label: "Obesity Class I",
        min_value: 30,
        max_value: 34.9,
        recommendations: [
          "Gira akamenyero ko kurya neza no gukora siporo buri munsi",
        ],
      },
      {
        status_code: "warning",
        label: "Overweight",
        min_value: 25,
        max_value: 29.9,
        recommendations: [
          "Genzura ingano y'ibiryo urya kandi uhitemo ibiryo bitanga ubuzima",
        ],
      },
      {
        status_code: "healthy",
        label: "Normal",
        min_value: 18.5,
        max_value: 24.9,
        recommendations: ["Komeza akamenyero keza ufite k'ubuzima"],
      },
      {
        status_code: "warning",
        label: "Underweight",
        max_value: 18.4,
        recommendations: [
          "Rya indyo yuzuye irimo poroteyine nyinshi",
          "Gana ivuriro bakugire inama nyuma y'ibyumweru bine",
        ],
      },
    ],
  },
};

export const readingsTestData = {
  "hypertension-critical": {
    readings: {
      systolic_blood_pressure: {
        value: 180,
        unit: "mmHg",
      },
      diastolic_blood_pressure: {
        value: 120,
        unit: "mmHg",
      },
    },

    label: "Hypertensive Crisis",
    status_code: "critical",
  },

  "diabetes-critical": {
    readings: {
      random_blood_glucose: {
        value: 250,
        unit: "mg/dL",
      },
    },
    label: "Possible Diabetes",
    status_code: "critical",
  },

  "bmi-obesity-class-3": {
    readings: {
      height: {
        value: 170,
        unit: "cm",
      },
      weight: {
        value: 120,
        unit: "kg",
      },
    },
    label: "Obesity Class III",
    status_code: "critical",
  },
};

export const invalidEncounterPayloadCases = [
  {
    name: "missing patientNumber/registerUserDto",
    payload: {
      urgency: "low",
    },

    message: i18next.t("patient_not_found", { lng: TEST_LANG }),
    statusCode: 404,
  },
  {
    name: "invalid urgency",
    payload: {
      patientNumber: existingPatientsTestData["rutenga-one"].patientNumber,
      urgency: "urgent",
    },
    message: "Validation failed",
    errors: {
      urgency: i18next.t("urgency_must_be_one_of_low_medium_high_emergency", {
        lng: TEST_LANG,
      }),
    },
    statusCode: 400,
  },
];
