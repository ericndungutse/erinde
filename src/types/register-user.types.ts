export interface RegisterUserDTO {
  firstname: string;
  lastname: string;
  birthdate: Date | string;
  address: {
    province: string;
    city: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  nationalIdentificationNumber: string;
}
