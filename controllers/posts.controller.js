import User from "../models/user.model.js";
import Post from "../models/posts.model.js";
import Comment from "../models/comments.model.js";

/** Health */
export const activeCheck = async (_req, res) =>
  res.status(200).json({ message: "running" });

/** Create Post */
export const createPost = async (req, res) => {
  try {
    // user comes from auth middleware
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { body = "", isPublic = true } = req.body;

    // Use default image if no file uploaded
    const fileUrl = req.file
      ? `/uploads/${req.file.filename}`
      : "/uploads/default.jpg";
    const fileType = req.file?.mimetype || "";

    const post = await Post.create({
      author: userId,
      body,
      fileUrl,
      fileType,
      isPublic,
    });

    // Return populated author details so UI always sees correct user info
    const populated = await Post.findById(post._id)
      .populate({
        path: "author",
        select: "name username email profile.avatar",
      })
      .lean();

    return res.status(201).json({ message: "Post created", post: populated });
  } catch (err) {
    console.error("createPost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Get all posts (feed) */
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "name username email profile.avatar",
      })
      .lean();

    return res.status(200).json({ posts });
  } catch (err) {
    console.error("getAllPosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Delete post (author only) */
export const deletePost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ message: "postId required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== userId)
      return res.status(403).json({ message: "Forbidden" });

    await Post.deleteOne({ _id: postId });
    return res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    console.error("deletePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Comment on a post */
export const commentPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { postId, text } = req.body;
    if (!postId || !text)
      return res.status(400).json({ message: "Invalid payload" });

    const comment = await Comment.create({
      postId,
      userId,
      text,
    });

    await Post.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } });

    return res.status(201).json({ message: "Comment added", comment });
  } catch (err) {
    console.error("commentPost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Get comments by post */
export const get_comments_by_post = async (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: "postId required" });

    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "name username email profile.avatar",
        model: "User",
      })
      .lean();

    return res.status(200).json({ comments });
  } catch (err) {
    console.error("get_comments_by_post error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Increment likes */
export const increment_likes = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ message: "postId required" });

    // Toggle like
    const already = await Post.findOne({ _id: postId, likes: userId }).lean();
    if (already) {
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      return res.status(200).json({ liked: false });
    } else {
      await Post.updateOne({ _id: postId }, { $addToSet: { likes: userId } });
      return res.status(200).json({ liked: true });
    }
  } catch (err) {
    console.error("increment_likes error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
