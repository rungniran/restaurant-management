# QR Food Order — MVP

ระบบสั่งอาหารผ่าน QR Code สำหรับร้านอาหาร ตอนนี้มี **2 ฝั่ง frontend** เท่านั้น
(รวม staff + kitchen เป็นแอปเดียวกันแล้ว) และ **backend เป็นคนจัดการ build/serve ทั้งหมด**:

```
qr-food-order/
├── backend/
│   ├── src/                 Node.js + Express + MongoDB + Socket.io (REST API + Real-time)
│   └── public/               <- build output ของ frontend มาอยู่ที่นี่ (สร้างโดย npm run build:frontend)
│       ├── customer/         served ที่ /
│       └── staff/            served ที่ /staff
└── frontend/
    ├── customer/             Vue 3 — ลูกค้าสแกน QR สั่งอาหาร (ไม่ต้อง login)
    └── staff/                Vue 3 — Staff + Kitchen Display รวมกัน (ต้อง login, มี role-based nav)
```

ฟีเจอร์ที่ทำไว้ใน MVP:
QR ประจำโต๊ะ, Digital Menu (สั่งง่ายแบบ 1 แตะ), Cart, สั่งอาหาร, Order Status (real-time),
Kitchen Display (real-time, แยก station), เรียกพนักงาน, PromptPay QR (เต็มบิล/หารเท่ากัน/เลือกจ่ายรายการ),
จัดการโต๊ะ (เพิ่ม/ปล่อย/ต่อโต๊ะ), ระบบจองโต๊ะ, ประวัติการชำระเงิน, **จัดการเมนูอาหาร (เพิ่ม/แก้ไข/ลบ/เปิดปิดขาย)**,
**Dashboard สรุปยอดขาย** (KPI, Peak Hours, Top Menu Items, Revenue Analysis),
**QR Code Display & Management** (พิมพ์ + คัดลอก URL)

---

## Landing Page / Sign Up / Create Restaurant

มี 3 จุดเริ่มต้นสำคัญในแอปสำหรับฝั่งเจ้าของร้าน:

- `http://localhost:4000/staff` หรือ `/staff` → หน้าเข้าสู่ระบบประจำ staff app
- `http://localhost:4000/staff/#/signup` → หน้า สมัครสมาชิก / สร้างร้านค้า
- `http://localhost:4000/staff/#/` หรือ `http://localhost:4000/staff` หลัง login แล้ว → จะ redirect ไป Setup Wizard / Dashboard ตาม role

### Flow ที่ใช้จริง

1. เปิด landing page: `http://localhost:4000/staff/#/` หรือ `http://localhost:4000/staff`
2. คลิก `สมัครสมาชิก`
3. กรอกข้อมูลร้าน เช่น ชื่อร้าน, ชื่อสำหรับแสดง, เบอร์โทร, ที่อยู่, โลโก้
4. ระบบจะสร้างร้านและ owner account ให้โดยอัตโนมัติ
5. หลังสมัครเสร็จ จะเข้าสู่ `Setup Wizard` โดยตรง
6. ใน Setup Wizard สามารถตั้งค่าเมนู, โต๊ะ, QR, พนักงาน และเปิด/ปิดร้านได้

> หมายเหตุ: ถ้าเป็นการรันแบบ backend serve ทุกอย่าง (production-style) หน้า landing และ signup จะอยู่ภายใน staff app เดียวกัน โดย route อยู่ใน Vue Router ของ `frontend/staff` และถูก serve ผ่าน `/staff`

## Staff app: 1 แอป รวม 6 หน้าที่ (role-based)

Login เข้า `/staff` ครั้งเดียว เมนูด้านซ้ายจะโชว์เฉพาะสิ่งที่ role นั้นเข้าได้:

| หน้า | roles ที่เห็น |
|---|---|
| 📊 Dashboard (สรุปยอดขาย) | owner, manager |
| 🍳 จอครัว (Kitchen Display) | owner, manager, kitchen |
| 🪑 จัดการโต๊ะ (เพิ่ม/ปล่อย/ต่อโต๊ะ) | owner, manager, waiter, cashier |
| 📅 การจอง | owner, manager, waiter |
| 📋 เมนูอาหาร | owner, manager |
| 🧾 ประวัติการชำระเงิน | owner, manager, cashier |

Login ด้วย role `kitchen` จะพาไปหน้า "จอครัว" ทันทีหลัง login (เพราะเป็นหน้าเดียวที่ role นี้ใช้งาน)

---

## วิธีรันแบบเร็วที่สุด (production-style: backend serve ทุกอย่าง)

```bash
# 1) เตรียม backend
cd backend
cp .env.example .env      # แก้ MONGO_URI และ PROMPTPAY_ID ให้ตรงกับของจริง
npm install

# 2) สร้างข้อมูลตัวอย่าง
npm run seed

# 3) build ทั้ง 2 frontend (backend สั่ง build ให้เอง แล้ววางไฟล์ไว้ที่ backend/public)
npm run build:frontend

# 4) รัน backend ตัวเดียว — เสิร์ฟทั้ง API + customer app + staff app
npm start
```

เปิด:
- **Customer app**: `http://localhost:4000/order/<QR_TOKEN_จากขั้นตอน_seed>`
- **Staff+Kitchen app**: `http://localhost:4000/staff`

จบ — ไม่ต้องรัน `npm run dev` แยกหลาย terminal อีกต่อไป เพราะ backend เสิร์ฟไฟล์ static ให้เองทั้งหมด
(ทุกครั้งที่แก้โค้ด frontend ต้องรัน `npm run build:frontend` ใหม่เพื่ออัปเดตไฟล์ที่ backend เสิร์ฟ)

> ต้องการ dev-mode ที่ hot-reload ได้ (แก้โค้ดแล้วเห็นผลทันที)? ดูหัวข้อ "โหมด Dev แยก server" ด้านล่าง

---

## โหมด Dev แยก server (hot-reload ระหว่างพัฒนา)

ถ้ากำลังแก้ frontend บ่อยๆ แนะนำรันแยก dev server แทน (เร็วกว่าต้อง build ใหม่ทุกครั้ง):

```bash
# Terminal 1: backend
cd backend && npm run dev              # http://localhost:4000

# Terminal 2: customer app
cd frontend/customer
cp .env.example .env                    # ตั้ง VITE_API_URL=http://localhost:4000/api
npm install && npm run dev              # http://localhost:5173

# Terminal 3: staff+kitchen app
cd frontend/staff
cp .env.example .env                    # ตั้ง VITE_API_URL=http://localhost:4000/api
npm install && npm run dev              # http://localhost:5175/staff/  (base path คงที่แม้ตอน dev)
```

**Staff login สำหรับทดสอบ** (จาก `npm run seed`):
- `owner / owner123` — เห็นทุกหน้า
- `kitchen / kitchen123` — เห็นเฉพาะจอครัว
- `waiter / waiter123` — โต๊ะ + การจอง
- `cashier / cashier123` — โต๊ะ + ประวัติการชำระเงิน

**การสั่งอาหารแบบง่ายที่สุด (ฝั่งลูกค้า):** เมนูที่ไม่มี option ให้เลือก (เช่น น้ำเปล่า) จะมีปุ่ม "+ เพิ่ม"
ที่การ์ดเมนูเลย แตะครั้งเดียวเข้าตะกร้าทันที ไม่ต้องเปิดหน้าต่างเลือก option — เมนูที่มี option
(เช่น ความเผ็ด) จะเปิดหน้าต่างให้เลือกตามปกติ ส่วนแถบค้นหาและแท็บหมวดหมู่จะ **ตรึงอยู่ด้านบนเสมอ**
ขณะเลื่อนดูเมนู ไม่ต้องเลื่อนกลับขึ้นไปด้านบนเพื่อค้นหาหรือเปลี่ยนหมวดหมู่

---

## Flow การทดสอบระบบแบบครบวงจร

1. รัน backend + seed ข้อมูล + build frontend (หรือรันแบบ dev แยก server ก็ได้)
2. เปิด staff app → login เป็น `owner` → ไปหน้า "เมนูอาหาร" → ลองเพิ่มหมวดหมู่ + เพิ่มเมนูอาหารเอง
3. ไปหน้า "จัดการโต๊ะ" → ลองเพิ่มโต๊ะ, ต่อโต๊ะ 2 โต๊ะเข้าด้วยกัน, ลองกด "ปล่อยโต๊ะ" กับโต๊ะที่ว่างอยู่แล้ว
   (ปุ่มจะเป็นสีเทาจางกดไม่ได้ เพราะโต๊ะว่างอยู่แล้วไม่ต้องปล่อยซ้ำ)
4. เปิดแท็บใหม่ไปหน้า "จอครัว" (หรือ login ด้วย `kitchen`) เปิดค้างไว้
5. เปิด customer app ด้วย QR token → ลองกด "+ เพิ่ม" แบบเร็วๆ → สั่งอาหาร
6. ดูออเดอร์ขึ้นที่ Kitchen Display ทันที (real-time ผ่าน Socket.io — เชื่อมด้วย JWT ตอน connect
   ทำให้ join ห้อง real-time ได้ทันทีไม่มี race condition และ auto-sync ใหม่ทุกครั้งที่ reconnect)
7. กลับไปหน้า "สถานะออเดอร์" ฝั่งลูกค้า → ลองกด "จ่ายออเดอร์นี้เลย" หรือ "เช็คบิลรวม"
8. ในหน้าเช็คบิล ลองสลับโหมด "จ่ายเต็มบิล" / "หารเท่ากัน" / "เลือกจ่ายรายการ" — ได้ QR PromptPay จริง
9. เปิดหน้า "ประวัติการชำระเงิน" ใน staff app → เห็นรายการที่เพิ่งสร้าง → กด "ยืนยันจ่ายแล้ว"

---

## ใบเสร็จ (พิมพ์ / อิเล็กทรอนิกส์)

ทุกการชำระเงินมีใบเสร็จของตัวเองที่ `/receipt/:paymentId` — เป็นหน้าแบบสแตนด์อโลนไม่ผูกกับ
qrToken จึงใช้ลิงก์เดียวกันได้ทั้ง 2 ทาง:

- **ฝั่งลูกค้า**: พอ QR PromptPay ถูกจ่ายสำเร็จ (สถานะเปลี่ยนแบบ real-time ผ่าน socket
  โดยไม่ต้อง refresh หน้า) จะมีลิงก์ "🧾 ดูใบเสร็จ / พิมพ์ใบเสร็จ" โผล่ขึ้นมาที่หน้าเช็คบิลทันที
  กดแล้วเปิดใบเสร็จ พร้อมปุ่ม "พิมพ์ใบเสร็จ" (เรียก `window.print()` พร้อม CSS สำหรับพิมพ์โดยเฉพาะ
  ซ่อนเมนู/ปุ่มต่างๆ ให้เหลือแต่ตัวใบเสร็จตอนพิมพ์จริง)
- **ฝั่ง staff**: หน้า "ประวัติการชำระเงิน" มีปุ่ม "🧾 ใบเสร็จ" ต่อแถว เปิดใบเสร็จเดียวกันในแท็บใหม่
  สำหรับพิมพ์ซ้ำหรือเช็คย้อนหลังได้ทุกเมื่อ

ใบเสร็จแสดงรายการอาหารละเอียด, ยอดรวมย่อย/ค่าบริการ/VAT, เลขที่ใบเสร็จ, วันที่, วิธีชำระ และ
ถ้าเป็นบิลหารเท่ากันจะโชว์ "คนที่ N / M คน" พร้อมยอดที่ต้องจ่ายเฉพาะส่วนของตัวเองชัดเจน

> หมายเหตุ: ลิงก์ `/receipt/:id` จากหน้า Payment History ใช้ path แบบ absolute (`/receipt/...`)
> ซึ่งทำงานถูกต้อง 100% เมื่อรันแบบ backend serve ทั้งคู่ (`npm run build:frontend` แล้ว `npm start`)
> เพราะอยู่ origin เดียวกัน แต่ถ้ารันแบบ dev แยก server (staff บน 5175, customer บน 5173) ลิงก์นี้
> จะพยายามเปิดที่ origin ของ staff app เอง ซึ่งไม่มีหน้านี้ — ให้ทดสอบฟีเจอร์นี้ผ่านโหมด backend
> serve ทั้งคู่แทน

---

## บัคที่แก้ไปแล้ว: "สั่งออเดอร์แล้วไม่เข้าครัว"

สาเหตุคือ ห้อง real-time (Socket.io room) ของฝั่งครัว/staff แต่เดิมอาศัยการที่ client
ส่ง event `join` เองหลัง connect เสร็จ ซึ่งมีช่วงเวลาสั้นๆ ที่ order อาจถูกส่งออกไปก่อนที่ client
จะ join ห้องเสร็จ (โดยเฉพาะตอน dev server reload/HMR ทำให้ socket หลุดแล้วต่อใหม่แบบเงียบๆ)
ทำให้ order ที่เกิดขึ้นระหว่างนั้น "หาย" จนกว่าจะ refresh หน้าเอง

แก้โดย:
1. **Server join ห้องให้อัตโนมัติ** ทันทีที่ socket connect โดยตรวจสอบ JWT token ที่ส่งมาตอน
   connect (`socket.handshake.auth.token`) แทนที่จะรอ client emit "join" เอง — ตัด race condition ทิ้งไปเลย
2. **Self-heal เมื่อ reconnect**: ทุกครั้งที่ socket เชื่อมต่อ (รวมถึงตอน reconnect หลังหลุด)
   ฝั่ง kitchen/staff app จะดึงข้อมูลออเดอร์ทั้งหมดใหม่จาก API เพื่อ sync สถานะให้ตรงกันเสมอ
   ไม่พึ่งพา socket event เพียงอย่างเดียว

## บัคที่แก้ไปแล้ว: "เช็คบิลเสร็จแล้ว เหมือนออเดอร์เก่ายังค้างอยู่"

สาเหตุคือ โต๊ะ 1 โต๊ะถูกใช้ซ้ำโดยลูกค้าหลายรอบต่อวัน แต่ query ที่ดึงออเดอร์/บิลของลูกค้า
(`getTableByToken`, `getOrdersForTable`, `bill-summary`, การสร้าง QR ชำระเงิน, ประวัติการชำระเงินของโต๊ะ)
เดิมดึง **ออเดอร์ทั้งหมดของโต๊ะนั้นแบบไม่จำกัดช่วงเวลา** ทำให้พอโต๊ะถูกใช้ซ้ำ (พนักงานกด "ปล่อยโต๊ะ"
แล้วลูกค้าคนใหม่สแกน QR เดิม) ออเดอร์/บิลของลูกค้าคนก่อนหน้าที่จ่ายเงินไปแล้วยังโผล่ปนมาให้เห็นอยู่

แก้โดยเพิ่ม `sessionStartedAt` ใน Table model เป็นตัวคั่นมื้ออาหารปัจจุบัน แล้วปรับทุก query
ฝั่งลูกค้าให้ดึงเฉพาะออเดอร์ที่สร้างหลัง `sessionStartedAt` เท่านั้น โดยตัวแปรนี้จะถูกรีเซ็ตเป็นเวลาปัจจุบัน
เมื่อ: (1) พนักงานกด "ปล่อยโต๊ะ" (จบมื้อลูกค้าเก่า) หรือ (2) ลูกค้าใหม่สั่งอาหารคำสั่งแรกที่โต๊ะซึ่งว่างอยู่
(เริ่มมื้อใหม่) — ทำให้ order/บิลของลูกค้าคนก่อนไม่มีทางโผล่มาปนกับลูกค้าคนปัจจุบันอีก

## บัคที่แก้ไปแล้ว: "สั่ง order ครั้งแรกมีปัญหา"

ผลข้างเคียงจากการแก้บัคด้านบน: ตอนสั่ง order แรกของโต๊ะที่เพิ่งว่าง โค้ดเดิมสร้าง order ก่อน
(`Order.create()`) แล้วค่อยอัปเดต `table.sessionStartedAt = new Date()` **หลังจากนั้น** — เวลาที่
บันทึกไว้ใน order (`createdAt`) จึงเกิดขึ้นก่อนเวลาที่ตั้งเป็นจุดเริ่มมื้อเสมอ (ต่างกันแค่เสี้ยว
มิลลิวินาที) พอ query ฝั่งลูกค้ากรองด้วย `createdAt >= sessionStartedAt` ออเดอร์แรกสุดของทุกมื้อ
จะถูกกรองทิ้งไปเงียบๆ ทำให้ลูกค้าสั่งอาหารคำสั่งแรกไปแล้วแต่หน้า "สถานะออเดอร์" ไม่เห็นออเดอร์นั้นเลย
(แม้ order จะเข้าครัวถูกต้องเพราะฝั่งครัวไม่ได้กรองด้วย session)

แก้โดยสลับลำดับ: อัปเดต `table.sessionStartedAt` **ก่อน** สร้าง order เสมอ รับประกันว่า
order ที่เพิ่งสร้างจะมี `createdAt` ไม่มีทางเกิดก่อนจุดเริ่มมื้อได้อีก

---

## API ที่มีให้ (backend)

| Path | Auth | คำอธิบาย |
|---|---|---|
| `GET /api/menu/:restaurantId` | public | เมนูทั้งหมด แบ่งตามหมวด |
| `POST/PATCH/DELETE /api/menu/category`, `/item` | staff (owner/manager) | จัดการเมนู (มี UI แล้วที่หน้า "เมนูอาหาร") |
| `PATCH /api/menu/item/:id/toggle` | staff (owner/manager) | เปิด/ปิดขายเมนู |
| `GET /api/table/qr/:qrToken` | public | ข้อมูลโต๊ะ + ออเดอร์ปัจจุบัน + โต๊ะที่ต่อกัน |
| `GET /api/table/qr/:qrToken/bill-summary` | public | ยอดบิลรวม (รวมโต๊ะที่ต่อกันถ้ามี) |
| `POST /api/table` | staff | เพิ่มโต๊ะใหม่ (auto-generate QR token) |
| `POST /api/table/merge` | staff | ต่อโต๊ะ (รวมหลายโต๊ะเป็นกลุ่มบิลเดียว) |
| `PATCH /api/table/:id/unmerge` | staff | แยกโต๊ะออกจากกลุ่ม |
| `PATCH /api/table/:id/release` | staff | ปล่อยโต๊ะ (คืนสถานะว่าง) |
| `GET/POST /api/reservation` | staff | จองโต๊ะ / ดูรายการจอง |
| `PATCH /api/reservation/:id` | staff | เปลี่ยนสถานะการจอง |
| `POST /api/order` | public | ลูกค้าสั่งอาหาร |
| `GET /api/order/kitchen?station=` | staff | ออเดอร์สำหรับจอครัว |
| `PATCH /api/order/:orderId/item/:itemId` | staff | เปลี่ยนสถานะรายการอาหาร |
| `POST /api/payment/promptpay` | public | สร้าง QR PromptPay (เต็มบิล/บาง order/เลือกรายการ) |
| `POST /api/payment/split` | public | หารบิลเท่ากัน N คน |
| `GET /api/payment/history` | staff (cashier+) | ประวัติการชำระเงินทั้งหมด กรองได้ |
| `POST /api/payment/:id/confirm` | staff (cashier) | cashier ยืนยันว่าจ่ายแล้ว |
| `POST /api/service-request` | public | ลูกค้าเรียกพนักงาน/ขอบิล |
| `POST /api/staff/login` | public | login สำหรับ staff |
| `GET /api/dashboard/summary` | staff (owner/manager/cashier) | ยอดขาย, best seller, peak hour |

Socket.io events: `order:new`, `order:updated`, `table:status`, `service:requested`,
`service:acknowledged`, `payment:updated`. Staff/kitchen sockets ยืนยันตัวตนผ่าน
`io(url, { auth: { token } })` ตอน connect

---

## ขั้นตอนถัดไปที่แนะนำ (หลัง MVP)

1. **Staff account management UI** — API พร้อมแล้ว (`/api/staff`) ยังไม่มีหน้าจอสร้าง/แก้ไข staff account
2. **Floor Plan แบบ visual** สำหรับดูสถานะโต๊ะทั้งร้านเป็นผังจริง
3. ต่อ **payment gateway จริง** (เช่น Omise, 2C2P, SCB) เข้ากับ `paymentWebhook` เพื่อ auto-confirm การจ่ายเงิน
4. เพิ่มระบบ Coupon/Discount, สมาชิก/Loyalty
5. ตั้ง Docker + MongoDB Atlas สำหรับ deploy จริง, เปิด HTTPS, generate QR code จริงชี้ไปที่ production URL

## Deploy เป็น Production (สรุปคร่าวๆ)

```bash
cd backend
npm install
npm run build:frontend   # build ทั้ง customer + staff ไปไว้ที่ backend/public
npm start                 # backend serve API + ทั้งสอง frontend จาก process เดียว
```

ตั้ง environment variables (`MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `PROMPTPAY_ID`) ให้ตรงกับ
production และเปิด HTTPS เพราะ Socket.io/QR payment ควรรันบน HTTPS เท่านั้น — เมื่อ frontend
ถูกเสิร์ฟจาก backend เดียวกัน (same-origin) แล้ว ไม่จำเป็นต้องตั้ง `CORS_ORIGIN` ให้ครอบคลุมหลาย
port อีกต่อไป (มีประโยชน์เฉพาะตอน dev แยก server เท่านั้น)
