export const runtimePatients = {
  'nyiranuma-biryogo-valid': {
    firstname: 'From Nyiranuma Biryogo',
    lastname: 'aPatient',
    birthdate: '1990-01-01',
    address: {
      province: 'kigali',
      district: 'nyarugenge',
      sector: 'nyarugenge',
      cell: 'biryogo',
      village: 'nyiranuma',
    },
    contact: {
      phone: '0780000010',
      email: 'john.doe@example.com',
    },
    nationalIdentificationNumber: '1199990000000010',
  },

  'nyiranuma-biryogo-invalid-body': {
    lastname: 'aPatient',
    birthdate: '1990-01-01',
    address: {
      province: 'kigali',
      district: 'nyarugenge',
      sector: 'nyarugenge',
      cell: 'biryogo',
      village: 'nyiranuma',
    },
    contact: {
      phone: 'sadsa',
      email: 'john.doeom',
    },
    nationalIdentificationNumber: '1199990000000010',
  },
};

export const runTimeRandomPhoneNumbers = {
  one: '0000000000',
  two: '1000000000',
};

export const runtimeUserAccounts = {
  'admin-role-valid': {
    firstname: 'Regina',
    lastname: 'AdminCase',
    birthdate: '1991-04-04',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'ruvumera',
    },
    contact: {
      phone: '0780001010',
      email: 'regina.admincase@example.com',
    },
    nationalIdentificationNumber: '1199990000001010',
    roles: ['ADMIN'],
  },

  'admin-role-without-email': {
    firstname: 'Admin',
    lastname: 'NoEmail',
    birthdate: '1991-05-05',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'muhurura',
    },
    contact: {
      phone: '0780001011',
    },
    nationalIdentificationNumber: '1199990000001011',
    roles: ['ADMIN'],
  },

  'admin-role-rollback-test': {
    firstname: 'Admin',
    lastname: 'Rollback',
    birthdate: '1991-06-06',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'kagarama',
    },
    contact: {
      phone: '0780003030',
      email: 'rollback.admin.register@example.com',
    },
    nationalIdentificationNumber: '1199990000003030',
    roles: ['ADMIN'],
  },

  'invalid-admin-validation': {
    lastname: 'InvalidOnly',
    birthdate: '1991-07-07',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'kamonyi',
    },
    contact: {
      phone: '07800010ab',
      email: 'not-an-email',
    },
    nationalIdentificationNumber: '1199990000001012',
    roles: [],
  },

  'multi-role-screening-social-health': {
    firstname: 'MultiRole',
    lastname: 'User',
    birthdate: '1991-08-08',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'integration-role-merge-village',
    },
    contact: {
      phone: '0780002020',
      email: 'multi.roles@example.com',
    },
    nationalIdentificationNumber: '1199990000002020',
    roles: ['SCREENING_VOLUNTEER', 'SOCIAL_HEALTH_WORKER'],
  },

  'nurse-role-valid': {
    firstname: 'Nadine',
    lastname: 'NurseCase',
    birthdate: '1992-06-06',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'nyagatovu',
    },
    contact: {
      phone: '0780004040',
      email: 'nadine.nursecase@example.com',
    },
    nationalIdentificationNumber: '1199990000004040',
    roles: ['NURSE'],
  },

  'nurse-role-with-hospital': {
    firstname: 'Nadine',
    lastname: 'NurseHospital',
    birthdate: '1992-07-07',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'nyarutarama',
    },
    contact: {
      phone: '0780004041',
      email: 'nadine.nursecase.with.hospital@example.com',
    },
    nationalIdentificationNumber: '1199990000004041',
    roles: ['NURSE'],
  },

  'admin-role-duplicate-email-test': {
    firstname: 'DupEmail',
    lastname: 'User',
    birthdate: '1991-09-09',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'muhanga',
    },
    contact: {
      phone: '0780001099',
    },
    nationalIdentificationNumber: '1199990000001099',
    roles: ['ADMIN'],
  },

  'admin-role-duplicate-phone-test': {
    firstname: 'DupPhone',
    lastname: 'User',
    birthdate: '1991-10-10',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'kicukiro',
    },
    contact: {
      phone: '0780001088',
      email: 'unique.email.admin.register@example.com',
    },
    nationalIdentificationNumber: '1199990000001088',
    roles: ['ADMIN'],
  },

  'admin-role-duplicate-nin-test': {
    firstname: 'DupNIN',
    lastname: 'User',
    birthdate: '1991-11-11',
    address: {
      province: 'kigali',
      district: 'gasabo',
      sector: 'kimironko',
      cell: 'kibagabaga',
      village: 'musanze',
    },
    contact: {
      phone: '0780001022',
    },
    nationalIdentificationNumber: '1199990000001100',
    roles: ['ADMIN'],
  },
};

export const runTimeDiabetesAssessments = {};
