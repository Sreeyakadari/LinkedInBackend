// backend/models/user.model.js
import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  headline: { type: String, default: "" },
  about: { type: String, default: "" },
  location: { type: String, default: "" },
  experience: { type: Array, default: [] }, // keep simple; frontend may expect an array
  education: { type: Array, default: [] },
  resumeFilename: { type: String, default: "" }, // if user uploads resume
  avatar: { type: String, default: "default.jpg" },
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true }, // e.g. "john-doe"
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcrypt hash
  profile: { type: ProfileSchema, default: () => ({}) },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  token: { type: String, default: "" }, // optional JWT / session token
});

const User = mongoose.model("User", UserSchema);
export default User;
