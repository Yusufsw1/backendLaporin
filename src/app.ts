//app.ts

import express from "express";
import cors from "cors";
import login from "./routes/login";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import reportRoutes from "./routes/lapor";

const app = express();

dotenv.config();
app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth", login);
app.use("/api/v1/reports", reportRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
});
