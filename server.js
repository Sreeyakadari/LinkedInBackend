// backend/server.js
import express from "express";
import cors from "cors";
import path from "path";
import postsRoutes from "./routes/posts.routes.js";
import userRoutes from "./routes/user.routes.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

// ✅ Core middlewares
const allowedOrigins = [
  "http://localhost:3000",
  "https://linkedinfrontend-ug0f.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static serving for uploaded media so frontend can display avatars/files
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// ✅ Routes
app.use("/", postsRoutes);
app.use("/", userRoutes);

// ✅ DB + start
const PORT = process.env.PORT || 9090;
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("MONGO_URL not set in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URL, { dbName: process.env.MONGO_DB || "linkedin_clone" })
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log("Server running on", PORT));
  })
  .catch((err) => {
    console.error("Mongo error:", err);
    process.exit(1);
  });
