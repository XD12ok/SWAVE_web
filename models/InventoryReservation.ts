import { Schema, Types } from "mongoose";

import { BaseDocument } from "@/types/mongoose";
import { ReservationStatus } from "@/types/enums";
import { createModel } from "@/lib/createModel";

export interface IInventoryReservation extends BaseDocument {
  orderId: Types.ObjectId;

  charmId: Types.ObjectId;

  qty: number;

  expiresAt: Date;

  status: ReservationStatus;
}

const InventoryReservationSchema = new Schema<IInventoryReservation>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    charmId: {
      type: Schema.Types.ObjectId,
      ref: "Charm",
      required: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
  },
);

InventoryReservationSchema.index({
  expiresAt: 1,
});

export default createModel<IInventoryReservation>(
  "InventoryReservation",
  InventoryReservationSchema,
);
