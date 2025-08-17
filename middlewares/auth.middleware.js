import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ message: "Missing or invalid Authorization header" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    // payload should include { userId: "...", ... }
    if (!payload?.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach minimal user context for controllers
    req.user = {
      id: user._id.toString(),
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      avatar: user.profile?.avatar || "default.jpg",
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
