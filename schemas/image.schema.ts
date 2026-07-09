import { Schema } from "mongoose";

export const ImageSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
    },

    secureUrl: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);
