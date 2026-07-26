import { Schema } from "mongoose";

import { ImageSchema } from "./image.schema";

export interface IOrderItem {
  charmId: string;
  name: string;
  image?: {
    publicId: string;
    secureUrl: string;
  };
  price: number;
  discount?: number;
  qty: number;
  subtotal: number;
}

export const OrderItemSchema = new Schema<IOrderItem>(
  {
    charmId: {
      type: String,
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
