import { connectDB } from "@/lib/mongodb";
import CategoryModel from "@/models/Category";
import { ICategory } from "@/models/Category";
import { syncCategory } from "@/lib/sync-sheets";

export async function getCategories() {
  await connectDB();
  return CategoryModel.find({}).sort({ name: 1 }).lean();
}

export async function getCategoryById(id: string) {
  await connectDB();
  return CategoryModel.findById(id).lean();
}

export async function getCategoryBySlug(slug: string) {
  await connectDB();
  return CategoryModel.findOne({ slug }).lean();
}

export async function createCategory(data: { name: string; slug: string; description?: string }) {
  await connectDB();
  const category = await CategoryModel.create(data);
  void syncCategory(JSON.parse(JSON.stringify(category)));
  return category;
}

export async function updateCategory(id: string, data: Partial<ICategory>) {
  await connectDB();
  const category = await CategoryModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
  if (category) void syncCategory(JSON.parse(JSON.stringify(category)));
  return category;
}

export async function deleteCategory(id: string) {
  await connectDB();
  const category = await CategoryModel.findByIdAndDelete(id).lean();
  if (category) {
    void syncCategory({ ...JSON.parse(JSON.stringify(category)), _deleted: true });
  }
  return category;
}
