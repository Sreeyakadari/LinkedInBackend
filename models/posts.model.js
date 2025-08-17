// backend/models/posts.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const PostSchema = new Schema(
  {
    // Author reference (populate on reads)
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Content
    body: { type: String, default: "" },

    // Optional media fields (keep names you already used to avoid breaking UI)
    fileUrl: { type: String, default: "" },
    fileType: { type: String, default: "" },

    // Visibility + counts
    isPublic: { type: Boolean, default: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", PostSchema);
export default Post;
