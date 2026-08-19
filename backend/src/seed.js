import "dotenv/config";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { connectDB } from "./config/db.js";
import Restaurant from "./models/Restaurant.js";
import Table from "./models/Table.js";
import Category from "./models/Category.js";
import MenuItem from "./models/MenuItem.js";
import Staff from "./models/Staff.js";

const RESTAURANT_CONFIGS = [
  {
    name: "บุพเฟ่",
    displayName: "Burapa Dining House",
    phone: "0812345678",
    address: "123 ถนนใจดี กรุงเทพฯ",
    logoUrl: "",
    promptPayId: "0812345678",
    serviceChargePercent: 10,
    vatPercent: 7,
    pricingMode: "buffet",
    buffetPricePerPerson: 299,
  },
  {
    name: "บุพเฟ่ Signature",
    displayName: "Burapa Signature",
    phone: "0823456789",
    address: "456 ถนนสุขุมวิท กรุงเทพฯ",
    logoUrl: "",
    promptPayId: "0823456789",
    serviceChargePercent: 8,
    vatPercent: 7,
    pricingMode: "buffet",
    buffetPricePerPerson: 399,
  },
  {
    name: "บุพเฟ่ Bistro",
    displayName: "Burapa Bistro",
    phone: "0834567890",
    address: "789 ถนนสยาม กรุงเทพฯ",
    logoUrl: "",
    promptPayId: "0834567890",
    serviceChargePercent: 10,
    vatPercent: 5,
    pricingMode: "buffet",
    buffetPricePerPerson: 349,
  },
];

async function seedRestaurant(config) {
  const restaurant = await Restaurant.create(config);

  const tables = await Table.insertMany(
    Array.from({ length: 6 }).map((_, i) => ({
      restaurantId: restaurant._id,
      tableNumber: `${config.name[0]}${String(i + 1).padStart(2, "0")}`,
      zone: "Main",
      qrToken: nanoid(12),
      status: "available",
    }))
  );

  const [catFood, catDrink, catDessert] = await Category.insertMany([
    { restaurantId: restaurant._id, name: "อาหารจานหลัก", order: 1 },
    { restaurantId: restaurant._id, name: "เครื่องดื่ม", order: 2 },
    { restaurantId: restaurant._id, name: "ของหวาน", order: 3 },
  ]);

  await MenuItem.insertMany([
    {
      restaurantId: restaurant._id,
      categoryId: catFood._id,
      name: "ผัดกะเพราหมูสับ",
      description: "ผัดกะเพรารสจัดจ้าน",
      price: 60,
      station: "kitchen",
      options: [{ name: "ความเผ็ด", type: "single", required: true, choices: [{ label: "ไม่เผ็ด" }, { label: "เผ็ดน้อย" }, { label: "เผ็ดมาก" }] }],
    },
    {
      restaurantId: restaurant._id,
      categoryId: catFood._id,
      name: "ข้าวผัดหมู",
      description: "ข้าวผัดหมูสไตล์ไทย",
      price: 55,
      station: "kitchen",
      options: [],
    },
    {
      restaurantId: restaurant._id,
      categoryId: catDrink._id,
      name: "ชาไทยเย็น",
      description: "",
      price: 35,
      station: "drink",
      options: [],
    },
    {
      restaurantId: restaurant._id,
      categoryId: catDessert._id,
      name: "ข้าวเหนียวมะม่วง",
      description: "",
      price: 65,
      station: "dessert",
      options: [],
    },
  ]);

  const staffAccounts = [
    { name: `${config.name} Owner`, username: `${config.name.toLowerCase().replace(/\s+/g, "-")}-owner`, password: "owner123", role: "owner" },
    { name: `${config.name} Kitchen`, username: `${config.name.toLowerCase().replace(/\s+/g, "-")}-kitchen`, password: "kitchen123", role: "kitchen" },
    { name: `${config.name} Waiter`, username: `${config.name.toLowerCase().replace(/\s+/g, "-")}-waiter`, password: "waiter123", role: "waiter" },
    { name: `${config.name} Cashier`, username: `${config.name.toLowerCase().replace(/\s+/g, "-")}-cashier`, password: "cashier123", role: "cashier" },
  ];

  for (const acc of staffAccounts) {
    const passwordHash = await bcrypt.hash(acc.password, 10);
    await Staff.create({
      restaurantId: restaurant._id,
      name: acc.name,
      username: acc.username,
      passwordHash,
      role: acc.role,
    });
  }

  console.log(`Created restaurant: ${restaurant.name}`);
  console.log(`  Tables: ${tables.length}`);
  console.log(`  Staff logins: ${staffAccounts.map((a) => `${a.username} / ${a.password}`).join(", ")}`);

  return { restaurant, tables, staffAccounts };
}

async function seed() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    Restaurant.deleteMany({}),
    Table.deleteMany({}),
    Category.deleteMany({}),
    MenuItem.deleteMany({}),
    Staff.deleteMany({}),
  ]);

  const seeded = [];
  for (const config of RESTAURANT_CONFIGS) {
    const result = await seedRestaurant(config);
    seeded.push(result);
  }

  console.log("\n========== SEED COMPLETE ==========");
  seeded.forEach((entry) => {
    console.log(`Restaurant: ${entry.restaurant.name} (${entry.restaurant._id})`);
    console.log(`  QR tokens: ${entry.tables.map((t) => `${t.tableNumber}=${t.qrToken}`).join(" | ")}`);
  });
  console.log("====================================\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
