import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICounter extends Document {
  name: string;

  sequence: number;
}

const CounterSchema = new Schema<ICounter>({
  name: {
    type: String,
    unique: true,
    required: true,
  },

  sequence: {
    type: Number,
    default: 0,
  },
});

export default (mongoose.models.Counter as Model<ICounter>) ||
  mongoose.model<ICounter>("Counter", CounterSchema);
