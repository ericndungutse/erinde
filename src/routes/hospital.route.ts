import { Router } from "express";
import { container } from "../container.js";
import { authorize, protect } from "../security/auth.middleware.js";
import { UserRole } from "../types/roles.types.js";
import { CreateHospitalSchema } from "../types/hospital.types.js";
import { validateBody } from "../validation/validator.js";

const router = Router();

// GET /hospitals - List all hospitals (protected)
router.get("/", protect, (req, res, next) =>
  container.hospitalController.getAllHospitals(req, res, next),
);

// GET /hospitals/:id - Get hospital details by id (protected)
router.get("/:id", protect, (req, res, next) =>
  container.hospitalController.getHospitalById(req, res, next),
);

// POST /hospitals - Create a hospital (ADMIN only)
router.post(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(CreateHospitalSchema),
  (req, res, next) => container.hospitalController.createHospital(req, res, next),
);

export default router;
