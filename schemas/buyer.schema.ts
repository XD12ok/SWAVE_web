import { Schema } from "mongoose";

export interface IBuyer {
  name: string;
  email: string;
  phone: string;
}

export const BuyerSchema = new Schema<IBuyer>(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);
