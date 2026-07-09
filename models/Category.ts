import { Schema } from "mongoose";

import { BaseDocument } from "@/types/mongoose";
import { createModel } from "@/lib/createModel";

export interface ICategory extends BaseDocument {
  name: string;

  slug: string;

  description?: string;

  active: boolean;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    description: String,

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default createModel<ICategory>("Category", CategorySchema);
