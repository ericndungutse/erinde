import type { Document, Types } from "mongoose";
import { z } from "zod";
import { AddressSchema, type IAddress } from "./address.type.js";

export interface IHospital {
  id: Types.ObjectId;
  name: string;
  type: HospitalType;
  address: IAddress;
}

export enum HospitalType {
  DISTRICT = "DISTRICT_HOSPITAL",
  HEALTH_CENTER = "HEALTH_CENTER",
  REFERRAL = "REFERRAL_HOSPITAL",
}

// Using nativeEnum maps the domain enum directly to validation
export const HospitalTypeSchema = z.enum(
  Object.values(HospitalType) as [string, ...string[]],
);

// Create Hospital Schema
export const CreateHospitalSchema = z.object({
  name: z
    .string({ message: "hospital_name_is_required" })
    .min(3, "hospital_name_must_be_at_least_3_characters_long"),
  type: HospitalTypeSchema,
  address: AddressSchema,
});

// Mongoose types
export interface IHospitalDocument extends IHospital, Document {}
