
// import { pinoHttp } from 'pino-http';
import cors from "cors";
import * as middleware from "i18next-http-middleware";
import express, { type Request, type Response } from "express";
const app = express();
import indicatorRoutes from "./routes/indicator.route.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import assessmentRoutes from "./routes/assessment.route.js";
import referralRoutes from "./routes/referral.route.js";
import nurseRoutes from "./routes/nurse.routes.js";
import hospitalRoutes from "./routes/hospital.route.js";
import communitHealthUnitRoutes from "./routes/communitHealthUnit.route.js";
import { UserService } from "./service/user.service.js";
import GlobalErrorHandler from "./Errors/globalErrorHandler.js";
import i18next from "./i18n.js";

app.use(cors());
app.use(express.json());
app.use(middleware.handle(i18next));



// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

app.use("/test", async (_req, res) => {
  const userService = new UserService();
  const healthWoker =
    await userService.findSocialHealthWorkerByVillage("rutenga");
  const healthWoker2 =
    await userService.findSocialHealthWorkerByVillage("ruvumera");

  res.json({ healthWoker, healthWoker2 });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/indicators", indicatorRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/assessments", assessmentRoutes);
app.use("/api/v1/referrals", referralRoutes);
app.use("/api/v1/nurse", nurseRoutes);
app.use("/api/v1/hospitals", hospitalRoutes);
app.use("/api/v1/community-health-units", communitHealthUnitRoutes);

app.all("/{*any}", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    GlobalErrorHandler.getInstance().handleError(err, req, res, next);
  },
);
export default app;
