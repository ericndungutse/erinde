import { Router } from "express";
import { container } from "../container.js";
import { protect } from "../security/auth.middleware.js";

const router = Router();

// GET /hospitals - List all hospitals (protected)
router.get("/", protect, (req, res, next) =>
  container.hospitalController.getAllHospitals(req, res, next),
);

export default router;
