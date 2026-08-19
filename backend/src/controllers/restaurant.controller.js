import bcrypt from "bcryptjs";
import Restaurant from "../models/Restaurant.js";
import Staff from "../models/Staff.js";
import Category from "../models/Category.js";
import MenuItem from "../models/MenuItem.js";
import Table from "../models/Table.js";

function slugify(value) {
  return (value || "restaurant")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "restaurant";
}

// POST /api/restaurant  (public) - create a new restaurant with owner account
export async function createRestaurant(req, res) {
  const { name, displayName, phone, address, logoUrl } = req.body || {};
  if (!name || !displayName) {
    return res.status(400).json({ error: "กรุณากรอกชื่อร้านและชื่อสำหรับแสดง" });
  }

  const restaurant = await Restaurant.create({
    name,
    displayName,
    phone: phone || "",
    address: address || "",
    logoUrl: logoUrl || "",
  });

  let baseUsername = `${slugify(name)}-owner`;
  let username = baseUsername;
  let counter = 1;

  while (await Staff.exists({ username, restaurantId: restaurant._id })) {
    username = `${baseUsername}-${counter}`;
    counter += 1;
  }

  const defaultPassword = "owner123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const owner = await Staff.create({
    restaurantId: restaurant._id,
    name: displayName,
    username,
    passwordHash,
    role: "owner",
  });

  res.status(201).json({
    restaurant,
    owner: {
      id: owner._id,
      username,
      password: defaultPassword,
      role: owner.role,
    },
  });
}

// GET /api/restaurant  (public) - list restaurants for login / tenant selection
export async function listRestaurants(req, res) {
  const restaurants = await Restaurant.find({}).sort({ name: 1 }).select("_id name displayName logoUrl");
  res.json(restaurants);
}

// GET /api/restaurant/setup-status  (staff auth)
export async function getSetupStatus(req, res) {
  const restaurantId = req.staff.restaurantId;
  const [categoryCount, itemCount, tableCount, staffCount] = await Promise.all([
    Category.countDocuments({ restaurantId }),
    MenuItem.countDocuments({ restaurantId }),
    Table.countDocuments({ restaurantId }),
    Staff.countDocuments({ restaurantId }),
  ]);

  const restaurant = await Restaurant.findById(restaurantId).select("name displayName phone address logoUrl isOpen");

  const steps = [
    { key: "restaurant", label: "ตั้งค่าร้านของคุณ", done: !!(restaurant?.name && restaurant?.displayName), href: "/" },
    { key: "tables", label: "สร้างโต๊ะ", done: tableCount > 0, href: "/tables" },
    { key: "qr", label: "สร้าง QR", done: tableCount > 0, href: "/tables" },
    { key: "staff", label: "เพิ่มพนักงาน", done: staffCount > 1, href: "/dashboard" },
    { key: "category", label: "สร้างหมวดหมู่", done: categoryCount > 0, href: "/menu" },
    { key: "menu", label: "เพิ่มอาหาร", done: itemCount > 0, href: "/menu" },
  ];

  const completed = steps.filter((step) => step.done).length;
  res.json({
    restaurant,
    completed,
    total: steps.length,
    steps,
    progress: Math.round((completed / steps.length) * 100),
  });
}

// GET /api/restaurant/me  (staff auth)
export async function getMyRestaurant(req, res) {
  const restaurant = await Restaurant.findById(req.staff.restaurantId);
  res.json(restaurant);
}

// PATCH /api/restaurant/me  (staff auth: owner/manager)
export async function updateMyRestaurant(req, res) {
  const restaurant = await Restaurant.findByIdAndUpdate(req.staff.restaurantId, req.body, { new: true });
  res.json(restaurant);
}
