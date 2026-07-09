import { Schema } from "mongoose";

export const StoreSchema = new Schema(
  {
    name: String,
    email: String,
    phone: String,

    logo: {
      publicId: String,
      secureUrl: String,
    },
  },
  {
    _id: false,
  },
);
