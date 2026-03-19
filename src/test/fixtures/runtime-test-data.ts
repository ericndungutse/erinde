export const runtimePatients = {
  'nyiranuma-biryogo-valid': {
    firstname: "From Nyiranuma Biryogo",
    lastname: "aPatient",
    birthdate: "1990-01-01",
    address: {
      province: "kigali",
      district: "nyarugenge",
      sector: "nyarugenge",
      cell: "biryogo",
      village: "nyiranuma",
    },
    contact: {
      phone: "0780000010",
      email: "john.doe@example.com",
    },
    nationalIdentificationNumber: "1199990000000010",
  },

   'nyiranuma-biryogo-invalid-body': {
    lastname: "aPatient",
    birthdate: "1990-01-01",
    address: {
      province: "kigali",
      district: "nyarugenge",
      sector: "nyarugenge",
      cell: "biryogo",
      village: "nyiranuma",
    },
    contact: {
      phone: "sadsa",
      email: "john.doeom",
    },
    nationalIdentificationNumber: "1199990000000010",
  },
};


export const runTimeRandomPhoneNumbers = {
  one: "0000000000",
  two: "1000000000",
}