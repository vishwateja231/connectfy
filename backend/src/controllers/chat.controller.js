import { generateStreamToken } from "../lib/stream.js";
import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";

export async function getStreamToken(req, res) {
  try {
    if (!req?.user?.id && !req?.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = (req.user.id || req.user._id).toString();
    const token = generateStreamToken(userId);

    const apiKey = process.env.STREAM_API_KEY || process.env.STEAM_API_KEY;

    if (!apiKey || !token) {
      return res.status(500).json({ message: "Stream configuration missing" });
    }

    res.status(200).json({ token, apiKey });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function ensureStreamUsers(req, res) {
  try {
    const { userIds } = req.body || {};

    const ids = (Array.isArray(userIds) ? userIds : [userIds])
      .filter(Boolean)
      .map((id) => id.toString());

    if (!ids.length) {
      return res.status(400).json({ message: "userIds array is required" });
    }

    const users = await User.find({ _id: { $in: ids } }).select("_id fullName profilePic");

    if (!users?.length) {
      return res.status(404).json({ message: "Users not found" });
    }

    const results = [];
    for (const usr of users) {
      const payload = { id: usr._id.toString(), name: usr.fullName, image: usr.profilePic || "" };
      await upsertStreamUser(payload);
      results.push(payload);
    }

    res.status(200).json({ success: true, upserted: results });
  } catch (error) {
    console.error("Error ensuring Stream users:", error);
    res.status(500).json({ message: "Failed to ensure Stream users" });
  }
}
