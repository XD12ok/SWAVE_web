import { Schema } from "mongoose";

import { ImageSchema } from "./image.schema";

export const OrderItemSchema = new Schema(
  {
    charmId: {
      type: Schema.Types.ObjectId,
      ref: "Charm",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    image: ImageSchema,

    price: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    subtotal: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
  },
);
