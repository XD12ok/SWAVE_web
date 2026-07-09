import { Schema } from "mongoose";

import { PaymentStatus } from "@/types/enums";

import { ImageSchema } from "./image.schema";

export const PaymentSchema = new Schema(
  {
    method: String,

    amount: {
      type: Number,
      default: 0,
    },

    proofImage: ImageSchema,

    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.UNPAID,
    },

    paidAt: Date,

    confirmedAt: Date,
  },
  {
    _id: false,
  },
);
