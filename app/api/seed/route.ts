import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CategoryModel from "@/models/Category";
import CharmModel from "@/models/Charm";
import SettingsModel from "@/models/Settings";
import ShippingRuleModel from "@/models/ShippingRule";
import { toSlug } from "@/lib/slug";

export async function POST() {
  try {
    await connectDB();

    const results: Record<string, number> = {};

    const existingCategories = await CategoryModel.countDocuments();
    if (existingCategories === 0) {
      const categoryNames = ["Flower", "Animal", "Love", "Food", "Luxury"];
      for (const name of categoryNames) {
        await CategoryModel.create({
          name,
          slug: toSlug(name),
          description: `${name} charms collection`,
          active: true,
        });
      }
      results.categories = categoryNames.length;
    } else {
      results.categories = 0;
    }

    const existingCharms = await CharmModel.countDocuments();
    if (existingCharms === 0) {
      const seedCharms = [
        { name: "Rose", category: "Flower", price: 35000, stock: 15, image: "/charms/rose.png" },
        { name: "Heart", category: "Love", price: 45000, stock: 3, image: "/charms/heart.png" },
        { name: "Cat", category: "Animal", price: 40000, stock: 8, image: "/charms/cat.png" },
        { name: "Sunflower", category: "Flower", price: 38000, stock: 1, image: "/charms/sunflower.png" },
        { name: "Dog", category: "Animal", price: 42000, stock: 6, image: "/charms/dog.png" },
        { name: "Crown", category: "Luxury", price: 65000, stock: 0, image: "/charms/crown.png" },
        { name: "Star", category: "Love", price: 32000, stock: 12, image: "/charms/star.png" },
        { name: "Butterfly", category: "Animal", price: 48000, stock: 4, image: "/charms/butterfly.png" },
        { name: "Diamond", category: "Luxury", price: 85000, stock: 0, image: "/charms/diamond.png" },
        { name: "Cherry", category: "Food", price: 28000, stock: 10, image: "/charms/cherry.png" },
        { name: "Lotus", category: "Flower", price: 36000, stock: 7, image: "/charms/lotus.png" },
        { name: "Moon", category: "Love", price: 34000, stock: 5, image: "/charms/moon.png" },
        { name: "Rabbit", category: "Animal", price: 39000, stock: 9, image: "/charms/rabbit.png" },
        { name: "Ice Cream", category: "Food", price: 30000, stock: 2, image: "/charms/icecream.png" },
        { name: "Angel Wings", category: "Luxury", price: 72000, stock: 0, image: "/charms/wings.png" },
        { name: "Tulip", category: "Flower", price: 33000, stock: 11, image: "/charms/tulip.png" },
      ];

      const categories = await CategoryModel.find({}).lean();
      const catMap = new Map(categories.map((c) => [c.name, c._id]));

      for (const charm of seedCharms) {
        const catId = catMap.get(charm.category);
        if (!catId) continue;

        await CharmModel.create({
          category: catId,
          name: charm.name,
          slug: toSlug(charm.name),
          price: charm.price,
          stock: charm.stock ?? 10,
          reservedStock: 0,
          weight: 10,
          image: { publicId: "", secureUrl: charm.image },
          description: `${charm.name} charm`,
          active: true,
        });
      }
      results.charms = seedCharms.length;
    } else {
      results.charms = 0;
    }

    const existingSettings = await SettingsModel.countDocuments();
    if (existingSettings === 0) {
      await SettingsModel.create({
        store: { name: "SWAVE", email: "hello@swave.com", phone: "+6281234567890" },
        pickup: {
          address: "Jl. Example No. 123, Jakarta",
          latitude: -6.2088,
          longitude: 106.8456,
          openHour: "09:00",
          closeHour: "17:00",
        },
        delivery: { enabled: true, maxDistance: 50 },
        maintenance: false,
      });
      results.settings = 1;
    } else {
      results.settings = 0;
    }

    const existingRules = await ShippingRuleModel.countDocuments();
    if (existingRules === 0) {
      await ShippingRuleModel.create([
        { name: "Local", minKm: 0, maxKm: 5, price: 10000, active: true },
        { name: "Near", minKm: 5, maxKm: 15, price: 20000, active: true },
        { name: "Medium", minKm: 15, maxKm: 30, price: 35000, active: true },
        { name: "Far", minKm: 30, maxKm: 100, price: 50000, active: true },
      ]);
      results.shippingRules = 4;
    } else {
      results.shippingRules = 0;
    }

    return NextResponse.json({
      message: "Seed completed",
      seeded: results,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seed failed" },
      { status: 500 },
    );
  }
}
