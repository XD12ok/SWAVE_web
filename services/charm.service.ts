import { connectDB } from "@/lib/mongodb";
import CharmModel from "@/models/Charm";
import { ICharm } from "@/models/Charm";
import { syncCharm } from "@/lib/sync-sheets";

export async function getCharms(filters?: {
  category?: string;
  active?: boolean;
}) {
  await connectDB();

  await CharmModel.updateMany(
    {
      "discount.enabled": true,
      "discount.endAt": { $lte: new Date() },
    },
    { $set: { "discount.enabled": false } },
  );

  const query: Record<string, unknown> = {};

  if (filters?.category) {
    query.category = filters.category;
  }

  if (filters?.active !== undefined) {
    query.active = filters.active;
  }

  return CharmModel.find(query).populate("category").sort({ name: 1 }).lean();
}

export async function getCharmById(id: string) {
  await connectDB();
  return CharmModel.findById(id).populate("category").lean();
}

export async function getCharmBySlug(slug: string) {
  await connectDB();
  return CharmModel.findOne({ slug }).populate("category").lean();
}

export async function createCharm(data: Partial<ICharm>) {
  await connectDB();
  const charm = await CharmModel.create(data);
  void syncCharm(JSON.parse(JSON.stringify(charm)));
  return charm;
}

export async function updateCharm(id: string, data: Partial<ICharm>) {
  await connectDB();
  const charm = await CharmModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
  if (charm) void syncCharm(JSON.parse(JSON.stringify(charm)));
  return charm;
}

export async function deleteCharm(id: string) {
  await connectDB();
  const charm = await CharmModel.findByIdAndDelete(id).lean();
  if (charm) {
    void syncCharm({ ...JSON.parse(JSON.stringify(charm)), _deleted: true });
  }
  return charm;
}
