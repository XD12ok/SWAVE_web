import { Schema } from "mongoose";

import { DiscountType } from "@/types/enums";

export const DiscountSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    type: {
      type: String,
      enum: Object.values(DiscountType),
      default: DiscountType.PERCENTAGE,
    },

    value: {
      type: Number,
      default: 0,
    },

    startAt: Date,

    endAt: Date,
  },
  {
    _id: false,
  },
);
