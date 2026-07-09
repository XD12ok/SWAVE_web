import { Schema } from "mongoose";

export const PickupSchema = new Schema(
  {
    address: String,

    latitude: Number,

    longitude: Number,

    openHour: String,

    closeHour: String,
  },
  {
    _id: false,
  },
);
