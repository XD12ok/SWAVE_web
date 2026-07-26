import { Schema } from "mongoose";

import { ShippingMethod } from "@/types/enums";

export interface IShipping {
  method: ShippingMethod;
  receiverName?: string;
  phone?: string;
  province?: string;
  regency?: string;
  district?: string;
  village?: string;
  address?: string;
  postalCode?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  shippingCost?: number;
}

export const ShippingSchema = new Schema<IShipping>(
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
