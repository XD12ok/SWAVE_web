import { Schema, Types } from "mongoose";

import { BaseDocument } from "@/types/mongoose";
import { InventoryReason } from "@/types/enums";
import { createModel } from "@/lib/createModel";

export interface IInventoryLog extends BaseDocument {
  charmId: Types.ObjectId;

  before: number;

  after: number;

  change: number;

  reason: InventoryReason;

  reference?: string;
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    charmId: {
      type: Schema.Types.ObjectId,
      ref: "Charm",
      required: true,
    },

    before: Number,

    after: Number,

    change: Number,

    reason: {
      type: String,
      enum: Object.values(InventoryReason),
    },

    reference: String,
  },
  {
    timestamps: true,
  },
);

export default createModel<IInventoryLog>("InventoryLog", InventoryLogSchema);
