import { readFileSync } from 'node:fs';
import type { RegisterUserDTO } from '../../dto/user.dto.js';

 const patients = JSON.parse(
   readFileSync(new URL("../fixtures/patients-test-data.json", import.meta.url), 'utf-8'),
);


export function getTestPatients() :Record<string, RegisterUserDTO> {
  return patients;
}