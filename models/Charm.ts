import { Schema, Types } from "mongoose";

import { BaseDocument } from "@/types/mongoose";
import { createModel } from "@/lib/createModel";
import { DiscountType } from "@/types/enums";

import { ImageSchema, IImage } from "@/schemas/image.schema";
import { DiscountSchema } from "@/schemas/discount.schema";

export interface ICharm extends BaseDocument {
  category: Types.ObjectId;

  name: string;
  slug: string;
  description?: string;

  image: IImage;

  price: number;

  stock: number;
  reservedStock: number;

  totalSold: number;

  weight: number;

  discount: {
    enabled: boolean;
    type: DiscountType;
    value: number;
    startAt?: Date;
    endAt?: Date;
  };

  limited: boolean;

  active: boolean;
}

const CharmSchema = new Schema<ICharm>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

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
      index: true,
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: ImageSchema,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalSold: {
      type: Number,
      default: 0,
      min: 0,
    },

    weight: {
      type: Number,
      default: 0,
    },

    discount: {
      type: DiscountSchema,
      default: () => ({}),
    },

    limited: {
      type: Boolean,
      default: false,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

CharmSchema.index({ name: 1 });

export default createModel<ICharm>("Charm", CharmSchema);
