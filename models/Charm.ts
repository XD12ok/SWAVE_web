import { Schema, Types } from "mongoose";

import { BaseDocument } from "@/types/mongoose";
import { createModel } from "@/lib/createModel";
import { DiscountType } from "@/types/enums";

import { ImageSchema } from "@/schemas/image.schema";
import { DiscountSchema } from "@/schemas/discount.schema";

export interface ICharm extends BaseDocument {
  category: Types.ObjectId;

  name: string;
  slug: string;
  description?: string;

  image: {
    publicId: string;
    secureUrl: string;
  };

  price: number;

  stock: number;
  reservedStock: number;

  weight: number;

  discount: {
    enabled: boolean;
    type: DiscountType;
    value: number;
    startAt?: Date;
    endAt?: Date;
  };

  active: boolean;
}

const CharmSchema = new Schema<ICharm>({
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

  discount: {
    type: DiscountSchema,
    default: () => ({}),
  },
});

export default createModel<ICharm>("Charm", CharmSchema);
