import { Schema } from "mongoose";

import { BaseDocument } from "@/types/mongoose";
import { createModel } from "@/lib/createModel";

export interface ISettings extends BaseDocument {
  store: {
    name?: string;
    email?: string;
    phone?: string;
    logo?: {
      publicId: string;
      secureUrl: string;
    };
  };

  pickup: {
    address?: string;
    latitude?: number;
    longitude?: number;
    openHour?: string;
    closeHour?: string;
  };

  delivery: {
    enabled: boolean;
    maxDistance: number;
  };

  maintenance: boolean;
}

const SettingsSchema = new Schema<ISettings>(
  {
    store: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },

    pickup: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },

    delivery: {
      enabled: {
        type: Boolean,
        default: false,
      },
      maxDistance: {
        type: Number,
        default: 0,
      },
    },

    maintenance: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export default createModel<ISettings>("Settings", SettingsSchema);
