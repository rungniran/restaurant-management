import "dotenv/config";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { connectDB } from "./config/db.js";
import Restaurant from "./models/Restaurant.js";
import Table from "./models/Table.js";
import Category from "./models/Category.js";
import MenuItem from "./models/MenuItem.js";
import Staff from "./models/Staff.js";
import Order from "./models/Order.js";
import Payment from "./models/Payment.js";
import Reservation from "./models/Reservation.js";
import ServiceRequest from "./models/ServiceRequest.js";
import InventoryItem from "./models/InventoryItem.js";

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const avatar = (id) => `https://i.pravatar.cc/160?img=${id}`;

const spicyOptions = [
  { name: "ระดับความเผ็ด", type: "single", required: true, choices: [{ label: "ไม่เผ็ด" }, { label: "เผ็ดน้อย" }, { label: "เผ็ดปกติ" }, { label: "เผ็ดมาก" }] },
];

const BUFFET_MENU = [
  {
    name: "ปิ้งย่าง",
    items: [
      ["หมูสามชั้นสไลซ์", "หมูนุ่มหมักซอสสูตรร้าน", 89, "grill", "photo-1544025162-d76694265947"],
      ["เนื้อริบอายสไลซ์", "เนื้อวัวคัดพิเศษสำหรับย่าง", 159, "grill", "photo-1558030006-450675393462"],
      ["กุ้งแม่น้ำ", "กุ้งสดตัวใหญ่ เนื้อหวาน", 189, "grill", "photo-1565680018434-b513d5e5fd47"],
      ["ปลาหมึกสด", "ปลาหมึกสดหั่นพอดีคำ", 119, "grill", "photo-1544943910-4c1dc44aab44"],
      ["ไก่หมักซอสเกาหลี", "ไก่นุ่มหมักซอสหวานเผ็ด", 79, "grill", "photo-1527477396000-e27163b481c2"],
    ],
  },
  {
    name: "อาหารไทย",
    items: [
      ["ผัดกะเพราหมูสับ", "กะเพราแท้ผัดไฟแรง เสิร์ฟพร้อมข้าว", 69, "kitchen", "photo-1562565652-a0d8f0c59eb4", spicyOptions],
      ["ต้มยำกุ้ง", "ต้มยำน้ำข้นกุ้งสด รสจัดจ้าน", 129, "kitchen", "photo-1455619452474-d2be8b1e70cd", spicyOptions],
      ["คอหมูย่างจิ้มแจ่ว", "คอหมูนุ่มย่างหอม เสิร์ฟน้ำจิ้มแจ่ว", 119, "grill", "photo-1544025162-d76694265947"],
      ["ไก่ทอดน้ำปลา", "ไก่ทอดกรอบหมักน้ำปลา", 99, "kitchen", "photo-1562967916-ebecf7112e2c"],
      ["ส้มตำไทย", "มะละกอสด ตำใหม่ทุกจาน", 79, "kitchen", "photo-1559314809-0d155014e29e", spicyOptions],
    ],
  },
  {
    name: "ของทานเล่น",
    items: [
      ["เกี๊ยวซ่าหมู", "เกี๊ยวซ่าทอดกรอบ ไส้หมูเต็มคำ", 69, "kitchen", "photo-1496116218417-1a781b1c416c"],
      ["เฟรนช์ฟรายส์", "มันฝรั่งทอดกรอบ เสิร์ฟซอสมะเขือเทศ", 59, "kitchen", "photo-1573080496219-bb080dd4f877"],
      ["ไก่คาราเกะ", "ไก่ทอดสไตล์ญี่ปุ่น", 79, "kitchen", "photo-1626082927389-6cd097cdc6ec"],
      ["ข้าวโพดเนย", "ข้าวโพดหวานคลุกเนยหอม", 49, "kitchen", "photo-1551754655-cd27e38d2076"],
    ],
  },
  {
    name: "เครื่องดื่ม",
    items: [
      ["ชาไทยเย็น", "ชาไทยหอมเข้ม หวานกำลังดี", 49, "drink", "photo-1558857563-b371033873b8"],
      ["ชามะนาว", "ชาหอมสดชื่น ผสมมะนาวแท้", 49, "drink", "photo-1556679343-c7306c1976bc"],
      ["น้ำอัดลม", "เลือกได้ทั้งโคล่า ส้ม และสไปร์ท", 39, "drink", "photo-1629203849820-fdd70d49c38e"],
      ["น้ำเปล่า", "น้ำดื่มเย็นสะอาด", 20, "drink", "photo-1548839140-29a749e1cf4d"],
    ],
  },
  {
    name: "ของหวาน",
    items: [
      ["ไอศกรีมกะทิ", "ไอศกรีมกะทิสด ท็อปปิงแน่นๆ", 69, "dessert", "photo-1563805042-7684c019e1cb"],
      ["ข้าวเหนียวมะม่วง", "มะม่วงสุกหวานกับข้าวเหนียวมูน", 89, "dessert", "photo-1621293954908-907159247fc8"],
      ["บิงซูชาไทย", "บิงซูนุ่มราดชาไทยเข้มข้น", 99, "dessert", "photo-1551024506-0bccd828d307"],
      ["ผลไม้รวม", "ผลไม้ตามฤดูกาลแช่เย็น", 59, "dessert", "photo-1619566636858-adf3ef46400b"],
    ],
  },
];

const NORMAL_MENU = [
  {
    name: "จานเดียว",
    items: [
      ["ข้าวกะเพราหมูสับไข่ดาว", "กะเพราหมูสับรสจัด เสิร์ฟพร้อมไข่ดาว", 75, "kitchen", "photo-1562565652-a0d8f0c59eb4", spicyOptions],
      ["ข้าวกะเพราเนื้อโคขุน", "เนื้อโคขุนผัดกะเพราใบใหญ่", 109, "kitchen", "photo-1544025162-d76694265947", spicyOptions],
      ["ข้าวผัดกุ้ง", "ข้าวผัดหอมกระทะพร้อมกุ้งสด", 99, "kitchen", "photo-1603133872878-684f208fb84b"],
      ["ข้าวหมูกรอบคั่วพริกเกลือ", "หมูกรอบคั่วพริกเกลือหอมๆ", 99, "kitchen", "photo-1515003197210-e0cd71810b5f", spicyOptions],
      ["ผัดซีอิ๊วหมู", "เส้นใหญ่ผัดซีอิ๊วกับหมูนุ่ม", 75, "kitchen", "photo-1559314809-0d155014e29e"],
    ],
  },
  {
    name: "กับข้าว",
    items: [
      ["ต้มยำกุ้งน้ำข้น", "กุ้งสด เห็ด และสมุนไพรไทย", 180, "kitchen", "photo-1455619452474-d2be8b1e70cd", spicyOptions],
      ["แกงเขียวหวานไก่", "แกงกะทิหอมเครื่องแกง เสิร์ฟพร้อมข้าว", 160, "kitchen", "photo-1601050690597-df0568f70950"],
      ["ปลากะพงทอดน้ำปลา", "ปลากะพงทอดกรอบ ราดน้ำปลาหวาน", 320, "kitchen", "photo-1559339352-11d035aa65de"],
      ["คอหมูย่าง", "คอหมูนุ่มย่างเตาถ่าน เสิร์ฟแจ่ว", 160, "grill", "photo-1544025162-d76694265947"],
      ["ผัดผักรวมกุ้ง", "ผักสดผัดน้ำมันหอยกับกุ้ง", 150, "kitchen", "photo-1512621776951-a57141f2eefd"],
    ],
  },
  {
    name: "ยำและส้มตำ",
    items: [
      ["ยำวุ้นเส้นทะเล", "วุ้นเส้น กุ้ง หมึก และผักสด", 150, "kitchen", "photo-1559314809-0d155014e29e", spicyOptions],
      ["ยำแซลมอน", "แซลมอนสดคลุกน้ำยำมะนาว", 220, "kitchen", "photo-1547592180-85f173990554", spicyOptions],
      ["ส้มตำปูปลาร้า", "มะละกอกรอบ น้ำปลาร้าสูตรบ้านสวน", 75, "kitchen", "photo-1559314809-0d155014e29e", spicyOptions],
      ["ลาบหมูคั่ว", "ลาบหมูคั่วข้าวคั่วหอม", 120, "kitchen", "photo-1544025162-d76694265947", spicyOptions],
    ],
  },
  {
    name: "พิซซ่าและพาสต้า",
    items: [
      ["พิซซ่ามาการิต้า", "ซอสมะเขือเทศ มอสซาเรลล่า และโหระพา", 189, "kitchen", "photo-1574071318508-1cdbab80d002"],
      ["พิซซ่าซีฟู้ด", "กุ้ง หมึก หอย และชีสยืดๆ", 249, "kitchen", "photo-1565299624946-b28f40a0ae38"],
      ["สปาเกตตีคาโบนารา", "เบคอน ไข่ และพาร์เมซานชีส", 179, "kitchen", "photo-1473093295043-cdd812d0e601"],
      ["สปาเกตตีผัดขี้เมาทะเล", "เส้นเหนียวนุ่มผัดสมุนไพรไทย", 199, "kitchen", "photo-1551183053-bf91a1d81141", spicyOptions],
    ],
  },
  {
    name: "เครื่องดื่ม",
    items: [
      ["อเมริกาโน่เย็น", "กาแฟคั่วกลาง หอมเข้ม สดชื่น", 65, "drink", "photo-1514432324607-a09d9b4aefdd"],
      ["ลาเต้เย็น", "เอสเปรสโซ่กับนมสดเนียนนุ่ม", 75, "drink", "photo-1461023058943-07fcbe16d735"],
      ["ชาไทยเย็น", "ชาไทยเข้มข้น หอมใบชา", 60, "drink", "photo-1558857563-b371033873b8"],
      ["น้ำมะพร้าวสด", "มะพร้าวน้ำหอมแช่เย็น", 80, "drink", "photo-1453825012366-3738046cb6c7"],
    ],
  },
  {
    name: "ของหวาน",
    items: [
      ["ข้าวเหนียวมะม่วง", "ข้าวเหนียวมูนกะทิสดกับมะม่วงน้ำดอกไม้", 120, "dessert", "photo-1621293954908-907159247fc8"],
      ["บัวลอยไข่หวาน", "บัวลอยแป้งนุ่มในน้ำกะทิหอม", 80, "dessert", "photo-1563805042-7684c019e1cb"],
      ["บราวนี่ไอศกรีม", "บราวนี่อุ่นเสิร์ฟพร้อมไอศกรีมวานิลลา", 150, "dessert", "photo-1578985545062-69928b1d9587"],
      ["ผลไม้รวมโยเกิร์ต", "ผลไม้สดกับโยเกิร์ตและกราโนลา", 110, "dessert", "photo-1512621776951-a57141f2eefd"],
    ],
  },
];

const RESTAURANT_CONFIGS = [
  {
    slug: "yangthai",
    name: "ย่างไทยริมคลอง",
    displayName: "Yang Thai Riverside Buffet",
    phone: "0812345678",
    address: "123 ถนนเจริญกรุง กรุงเทพฯ",
    logoUrl: image("photo-1558030006-450675393462"),
    promptPayId: "0812345678",
    serviceChargePercent: 0,
    vatPercent: 7,
    pricingMode: "buffet",
    buffetPricePerPerson: 299,
    buffetDurationMinutes: 90,
    isOpen: true,
    menu: BUFFET_MENU,
  },
  {
    slug: "baan-suan",
    name: "ครัวบ้านสวน",
    displayName: "Krua Baan Suan",
    phone: "0823456789",
    address: "45 ถนนพหลโยธิน กรุงเทพฯ",
    logoUrl: image("photo-1515003197210-e0cd71810b5f"),
    promptPayId: "0823456789",
    serviceChargePercent: 0,
    vatPercent: 7,
    pricingMode: "normal",
    buffetPricePerPerson: 0,
    buffetDurationMinutes: 90,
    isOpen: true,
    menu: NORMAL_MENU,
  },
];

async function seedRestaurant(config) {
  const restaurant = await Restaurant.create(config);

  const tables = await Table.insertMany(
    Array.from({ length: 12 }).map((_, i) => ({
      restaurantId: restaurant._id,
      tableNumber: `${config.slug === "yangthai" ? "Y" : "B"}${String(i + 1).padStart(2, "0")}`,
      zone: i < 6 ? "ด้านใน" : "ริมน้ำ",
      qrToken: nanoid(12),
      status: "available",
    }))
  );

  const categories = await Category.insertMany(
    config.menu.map((category, index) => ({ restaurantId: restaurant._id, name: category.name, order: index + 1 }))
  );

  const menuItems = config.menu.flatMap((category, categoryIndex) =>
    category.items.map(([name, description, price, station, imageId, options = []]) => ({
      restaurantId: restaurant._id,
      categoryId: categories[categoryIndex]._id,
      name,
      description,
      price,
      imageUrl: image(imageId),
      station,
      options,
      isAvailable: true,
    }))
  );
  const inventorySeed = [
    ["หมูสไลซ์", "kg", 35, 5, 180],
    ["เนื้อวัว", "kg", 22, 4, 320],
    ["กุ้งสด", "kg", 18, 3, 280],
    ["ผักรวม", "kg", 30, 5, 70],
    ["ข้าวสาร", "kg", 45, 10, 32],
    ["เส้นและแป้ง", "kg", 25, 5, 55],
    ["เครื่องปรุงไทย", "pack", 20, 4, 120],
    ["ผลไม้และของหวาน", "kg", 18, 4, 95],
  ];
  const inventoryItems = await InventoryItem.insertMany(
    inventorySeed.map(([name, unit, stock, reorderPoint, costPerUnit]) => ({
      restaurantId: restaurant._id,
      name,
      unit,
      stock,
      reorderPoint,
      costPerUnit,
      supplier: "ตัวอย่างซัพพลายเออร์",
    }))
  );
  const inventoryByName = new Map(inventoryItems.map((item) => [item.name, item]));
  const recipeFor = (item) => {
    const ingredient = item.station === "grill" ? inventoryByName.get("หมูสไลซ์") : item.station === "dessert" ? inventoryByName.get("ผลไม้และของหวาน") : item.station === "drink" ? inventoryByName.get("เครื่องปรุงไทย") : inventoryByName.get("ผักรวม");
    return ingredient ? [{ inventoryItemId: ingredient._id, quantity: item.station === "drink" ? 1 : 0.15 }] : [];
  };
  await MenuItem.insertMany(menuItems.map((item) => ({ ...item, costPrice: +(item.price * 0.35).toFixed(2), recipe: recipeFor(item) })));

  const staffAccounts = [
    { name: `${config.name} Owner`, username: `${config.slug}-owner`, password: "owner123", role: "owner", avatarUrl: avatar(12) },
    { name: `${config.name} Manager`, username: `${config.slug}-manager`, password: "manager123", role: "manager", avatarUrl: avatar(32) },
    { name: `${config.name} Kitchen`, username: `${config.slug}-kitchen`, password: "kitchen123", role: "kitchen", avatarUrl: avatar(14) },
    { name: `${config.name} Waiter`, username: `${config.slug}-waiter`, password: "waiter123", role: "waiter", avatarUrl: avatar(47) },
    { name: `${config.name} Cashier`, username: `${config.slug}-cashier`, password: "cashier123", role: "cashier", avatarUrl: avatar(5) },
  ];

  for (const acc of staffAccounts) {
    const passwordHash = await bcrypt.hash(acc.password, 10);
    await Staff.create({
      restaurantId: restaurant._id,
      name: acc.name,
      username: acc.username,
      passwordHash,
      role: acc.role,
      avatarUrl: acc.avatarUrl,
    });
  }

  console.log(`Created restaurant: ${restaurant.name}`);
  console.log(`  Tables: ${tables.length}`);
  console.log(`  Menu: ${menuItems.length} items in ${categories.length} categories`);
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
    Order.deleteMany({}),
    Payment.deleteMany({}),
    Reservation.deleteMany({}),
    ServiceRequest.deleteMany({}),
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
