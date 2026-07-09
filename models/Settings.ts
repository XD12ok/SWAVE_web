import { Schema } from "mongoose";

import { BaseDocument } from "@/types/mongoose";
import { createModel } from "@/lib/createModel";

export interface ISettings extends BaseDocument {
  store: StoreSchema,

  pickup: PickupSchema,

  delivery: {
    enabled: Boolean,

    maxDistance: Number,
  },

  maintenance: Boolean,
);

export default createModel<ISettings>("Settings", SettingsSchema);
