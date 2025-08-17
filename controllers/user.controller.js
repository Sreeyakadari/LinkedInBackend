// backend/controllers/user.controller.js
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

// ---------- Register ----------
export const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!username || !password || !email || !name)
      return res
        .status(400)
        .json({ message: "name, username, email and password required" });

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.findOne({
      $or: [{ username }, { email: normalizedEmail }],
    });
    if (exists)
      return res.status(400).json({ message: "User or email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username,
      email: normalizedEmail,
      password: hashed,
    });

    // Optionally issue token at register time
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    user.token = token;
    await user.save();

    return res.status(201).json({
      message: "User registered",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- Login ----------
export const login = async (req, res) => {
  try {

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in prod to require HTTPS
      sameSite: "none", // allows cross-site cookies when frontend and backend are on different domains
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days, adjust as needed
    });

    const { email, username, password } = req.body;
    if ((!email && !username) || !password)
      return res
        .status(400)
        .json({ message: "Provide email or username and password" });

    const query = email ? { email: email.toLowerCase().trim() } : { username };
    const user = await User.findOne(query);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    user.token = token;
    await user.save();

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profile: user.profile,
      },
      token,
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- Upload profile picture (multer middleware not included here) ----------
export const uploadProfilePicture = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.profile.avatar = req.file.filename;
    await user.save();
    return res.json({
      message: "Profile picture uploaded",
      avatar: user.profile.avatar,
    });
  } catch (err) {
    console.error("uploadProfilePicture", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- Update profile data (multiple fields & workHistory support) ----------
export const updateProfileData = async (req, res) => {
  try {
    const { username, updates, workHistoryAction } = req.body;
    // `updates` can include: username, profilename, bio, etc.
    // `workHistoryAction` can be: { type: "add", entry: {...} } or { type: "delete", id: "..." }

    if (!username) {
      return res.status(400).json({ message: "username required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update username if changed
    if (updates?.username && updates.username !== user.username) {
      const usernameTaken = await User.findOne({ username: updates.username });
      if (usernameTaken) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = updates.username;
    }

    // Update profile fields
    user.profile = user.profile || {};
    if (updates?.profilename) {
      user.profile.profilename = updates.profilename;
    }
    if (updates?.bio) {
      user.profile.bio = updates.bio;
    }

    // Handle workHistory updates
    if (workHistoryAction) {
      user.profile.workHistory = user.profile.workHistory || [];

      if (workHistoryAction.type === "add" && workHistoryAction.entry) {
        // Add new work history entry
        const newEntry = {
          id: Date.now().toString(), // simple unique ID
          ...workHistoryAction.entry,
        };
        user.profile.workHistory.push(newEntry);
      }

      if (workHistoryAction.type === "delete" && workHistoryAction.id) {
        user.profile.workHistory = user.profile.workHistory.filter(
          (job) => job.id !== workHistoryAction.id
        );
      }
    }

    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        profile: user.profile,
      },
    });
  } catch (err) {
    console.error("updateProfileData error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- Get user and profile ----------
export const getUserAndProfile = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    if (!userId) return res.status(400).json({ message: "userId required" });
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error("getUserAndProfile", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.body; // or req.params, depending on your route
    const updates = req.body;

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).populate("profile");

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};


// ---------- Get all user profiles ----------
export const getAllUserProfile = async (_req, res) => {
  try {
    const users = await User.find().select(
      "username name profile avatar email"
    );
    const payload = users.map((u) => ({
      id: u._id,
      username: u.username,
      name: u.name,
      profile: u.profile,
    }));
    return res.json(payload);
  } catch (err) {
    console.error("getAllUserProfile", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- Download profile (simple placeholder) ----------
export const downloadProfile = async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "uploads", "resume.pdf");
    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: "Resume not found" });
    return res.download(filePath);
  } catch (err) {
    console.error("downloadProfile", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- Connection request basic implementation ----------
export const sendConnectionRequest = async (req, res) => {
  try {
    const { fromUsername, toUsername } = req.body;
    if (!fromUsername || !toUsername)
      return res
        .status(400)
        .json({ message: "fromUsername and toUsername required" });
    const fromUser = await User.findOne({ username: fromUsername });
    const toUser = await User.findOne({ username: toUsername });
    if (!fromUser || !toUser)
      return res.status(404).json({ message: "User(s) not found" });

    // We'll store connection requests in a simple field on user.profile.requests (array)
    toUser.profile = toUser.profile || {};
    toUser.profile.requests = toUser.profile.requests || [];
    // avoid duplicates
    if (!toUser.profile.requests.includes(fromUser._id.toString())) {
      toUser.profile.requests.push(fromUser._id.toString());
      await toUser.save();
    }
    return res.json({ message: "Connection request sent" });
  } catch (err) {
    console.error("sendConnectionRequest", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyConnectionsRequests = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username)
      return res.status(400).json({ message: "username required" });
    const user = await User.findOne({ username }).select(
      "profile requests profile.requests"
    );
    const requests = (user && user.profile && user.profile.requests) || [];
    return res.json({ requests });
  } catch (err) {
    console.error("getMyConnectionsRequests", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const whatAreMyConnections = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username)
      return res.status(400).json({ message: "username required" });
    const user = await User.findOne({ username }).populate(
      "connections",
      "username name profile"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ connections: user.connections || [] });
  } catch (err) {
    console.error("whatAreMyConnections", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    const { username, fromUsername } = req.body;
    if (!username || !fromUsername)
      return res
        .status(400)
        .json({ message: "username and fromUsername required" });

    const user = await User.findOne({ username });
    const fromUser = await User.findOne({ username: fromUsername });
    if (!user || !fromUser)
      return res.status(404).json({ message: "User(s) not found" });

    // Ensure requests list exists
    user.profile = user.profile || {};
    user.profile.requests = user.profile.requests || [];
    // remove request
    user.profile.requests = user.profile.requests.filter(
      (id) => id !== fromUser._id.toString()
    );
    // add to connections if not there
    user.connections = user.connections || [];
    fromUser.connections = fromUser.connections || [];
    if (!user.connections.includes(fromUser._id))
      user.connections.push(fromUser._id);
    if (!fromUser.connections.includes(user._id))
      fromUser.connections.push(user._id);
    await user.save();
    await fromUser.save();
    return res.json({ message: "Connection accepted" });
  } catch (err) {
    console.error("acceptConnectionRequest", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get profile by username
export const getUserProfileAndUserBasedOnUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username)
      return res.status(400).json({ message: "username required" });
    const user = await User.findOne({ username }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error("getUserProfileAndUserBasedOnUsername", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Serve uploaded resume / files by filename
export const downloadProfileFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), "uploads", filename);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: "File not found" });
    return res.download(filePath);
  } catch (err) {
    console.error("downloadProfileFile", err);
    return res.status(500).json({ message: "Server error" });
  }
};
