import { Schema } from "mongoose";

import { BaseDocument } from "@/types/mongoose";
import { createModel } from "@/lib/createModel";

export interface IShippingRule extends BaseDocument {
  name: string;
  minKm: number;
  maxKm: number;
  price: number;
  active: boolean;
}

const ShippingRuleSchema = new Schema<IShippingRule>(
  {
    name: {
      type: String,
      required: true,
    },

    minKm: {
      type: Number,
      required: true,
    },

    maxKm: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default createModel<IShippingRule>("ShippingRule", ShippingRuleSchema);
