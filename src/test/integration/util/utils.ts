
import { ConstantValues } from "../../../constants/constant.values.js";
import type { RegisterUserDTO } from "../../../dto/user.dto.js";
import type { CreateAssessmentDTO } from "../../../types/assessment.types.js";
import  { ACCOUNT_SETUP } from "../../testDataSetup/account-setup.js";
import { loginByPhone } from "../../utils/auth-helpers.js";
import { client } from "../../utils/request-factory.js";
import { selectPatientByVillage } from "../../utils/testDataSelectors.js";

export async function getIndicators(): Promise<any> {
    return await client().get("/api/v1/indicators")
}

export function getIndicatorByName(indicators: any[], name: string): any {
    return indicators.find((indicator: any) => indicator.name === name);
}

export async function createAssessment(body: CreateAssessmentDTO, token: string): Promise<any> {
    return await client(token).post("/api/v1/assessments").send(body);
}

export async function registerPatient(patientData: RegisterUserDTO, token: string): Promise<any> {
    const registerRes = await client(token).post("/api/v1/users").send(patientData);
    return registerRes;
}

export async function arrangeAssessment(shwKey: keyof typeof ACCOUNT_SETUP, indicatorName: string) {
  // 1. Resolve SHW and patient
  const shw = ACCOUNT_SETUP[shwKey]!;
  const patient: RegisterUserDTO | undefined = selectPatientByVillage(shw.address.village);
  if (!patient) throw new Error("No patient found for SHW's village");

  // 2. Login as SHW
  const shwToken = await loginByPhone(shw.contact.phone, ConstantValues.DEFAULT_PASSWORD);

  // 3. Get indicators
  const indicatorsRes = await getIndicators();
  if (indicatorsRes.status !== 200) throw new Error("Failed to fetch indicators");
  const indicatorId = getIndicatorByName(indicatorsRes.body.data.indicators, indicatorName)?.id;
  if (!indicatorId) throw new Error(`Indicator "${indicatorName}" not found`);

  // 4. Register patient
  const registerRes = await registerPatient(patient!, shwToken);
  if (registerRes.status !== 201) throw new Error("Patient registration failed");

  const patientNumber = registerRes.body.data.patientNumber.patientNumber;

  // Return everything needed for the test to act
  return {
    shwToken,
    patientNumber,
    indicatorId,
  };
}