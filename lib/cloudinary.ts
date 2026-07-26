import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "swaveasset",
  api_key: process.env.CLOUDINARY_API_KEY || "317762931673135",
  api_secret: process.env.CLOUDINARY_API_SECRET || "GhPydZrj--GCGpU_roBzz7ZkLAY",
  secure: true,
});

export default cloudinary;
