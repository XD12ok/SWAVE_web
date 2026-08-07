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

// NOTE: no TTL index on expiresAt. Expiry is handled by `expireReservations`
// so reserved stock is atomically released AND the linked order is marked
// EXPIRED consistently. A TTL auto-delete would skip both steps.
InventoryReservationSchema.index({ expiresAt: 1 });

InventoryReservationSchema.index({ status: 1, expiresAt: 1 });

InventoryReservationSchema.index({ orderId: 1, status: 1 });

export default createModel<IInventoryReservation>(
  "InventoryReservation",
  InventoryReservationSchema,
);
