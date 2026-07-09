import { Document } from "mongoose";

export interface BaseDocument extends Document {
  createdAt: Date;
  updatedAt: Date;
}
