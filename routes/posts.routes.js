import express from "express";
import multer from "multer";
import {
  activeCheck,
  createPost,
  getAllPosts,
  deletePost,
  commentPost,
  get_comments_by_post,
  increment_likes,
} from "../controllers/posts.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Multer disk storage for media uploads (keeps your original approach)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads"),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname?.split(".").pop() || "bin";
    cb(null, `${unique}.${ext}`);
  },
});
const upload = multer({ storage });

// Health
router.get("/health", activeCheck);

// Posts
router.post("/post", requireAuth, upload.single("media"), createPost);
router.get("/posts", requireAuth, getAllPosts);
router.delete("/delete_post", requireAuth, deletePost);

// Comments
router.post("/comment", requireAuth, commentPost);
router.get("/get_comments", requireAuth, get_comments_by_post);

// Likes
router.post("/increment_post_like", requireAuth, increment_likes);

export default router;
