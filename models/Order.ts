import mongoose, { Schema, Model } from "mongoose";

import { BaseDocument } from "@/types/base-document";
import { IBuyer, BuyerSchema } from "@/schemas/buyer.schema";
import { IShipping, ShippingSchema } from "@/schemas/shipping.schema";
import { IPayment, PaymentSchema } from "@/schemas/payment.schema";
import { IOrderItem, OrderItemSchema } from "@/schemas/order-item.schema";
import { OrderStatus } from "@/types/enums";

export interface IOrder extends BaseDocument {
  invoiceNumber: string;
  buyer: IBuyer;
  shipping: IShipping;
  items: IOrderItem[];
  payment: IPayment;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  note?: string;
}

const OrderSchema = new Schema<IOrder>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    buyer: {
      type: BuyerSchema,
      required: true,
    },

    shipping: {
      type: ShippingSchema,
      default: {},
    },

    items: {
      type: [OrderItemSchema],
      required: true,
    },

    payment: {
      type: PaymentSchema,
      default: {},
    },

    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING_PAYMENT,
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    shippingCost: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      default: 0,
    },

    note: String,
  },
  {
    timestamps: true,
  },
);

export default (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>("Order", OrderSchema);
