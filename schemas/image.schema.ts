import { Schema } from "mongoose";

export interface IImage {
  publicId: string;
  secureUrl: string;
}

export const ImageSchema = new Schema<IImage>(
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
