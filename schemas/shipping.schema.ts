import { Schema } from "mongoose";

import { ShippingMethod } from "@/types/enums";

export const ShippingSchema = new Schema(
  {
    method: {
      type: String,
      enum: Object.values(ShippingMethod),
      required: true,
    },

    receiverName: String,

    phone: String,

    province: String,

    regency: String,

    district: String,

    village: String,

    address: String,

    postalCode: String,

    note: String,

    latitude: Number,

    longitude: Number,

    distanceKm: {
      type: Number,
      default: 0,
    },

    shippingCost: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
);
