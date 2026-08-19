<template>
  <div class="page">
    <header class="page-header">
      <h2 class="display">จัดการเมนูอาหาร</h2>
      <div class="actions">
        <button class="btn" @click="showCategoryModal = true">+ เพิ่มหมวดหมู่</button>
        <button class="btn btn-accent" @click="openAddItem()">+ เพิ่มเมนูอาหาร</button>
      </div>
    </header>

    <div v-if="menu.loading" class="empty">กำลังโหลด...</div>
    <div v-else-if="menu.categories.length === 0" class="empty">ยังไม่มีหมวดหมู่เมนู กด "+ เพิ่มหมวดหมู่" เพื่อเริ่มต้น</div>

    <div v-for="cat in menu.categories" :key="cat._id" class="cat-block">
      <div class="cat-head">
        <h3 class="cat-title">{{ cat.name }}</h3>
        <button class="link-btn danger" @click="menu.deleteCategory(cat._id)">ลบหมวดหมู่</button>
      </div>

      <div v-if="cat.items.length === 0" class="empty small">ยังไม่มีเมนูในหมวดนี้</div>

      <div class="items-grid">
        <div v-for="item in cat.items" :key="item._id" class="item-card card" :class="{ unavailable: !item.isAvailable }">
          <!-- Image -->
          <div class="item-image-wrapper">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.name"
              class="item-image"
              @error="$event.target.style.display = 'none'"
            />
            <div v-else class="item-image-placeholder">
              <i class="fa-solid fa-image"></i>
            </div>
          </div>

          <!-- Content -->
          <div class="item-content">
            <div class="item-header">
              <div>
                <div class="item-name">{{ item.name }}</div>
                <div v-if="item.description" class="item-desc">{{ item.description }}</div>
              </div>
              <span class="item-price">฿{{ item.price }}</span>
            </div>

            <div class="item-meta">
              <span class="chip station-chip">{{ stationLabel(item.station) }}</span>
              <span class="chip" :class="item.isAvailable ? 'chip-available' : 'chip-cancelled'">
                {{ item.isAvailable ? "มีขาย" : "หมด" }}
              </span>
            </div>

            <div class="item-actions">
              <button class="btn small" @click="menu.toggleAvailability(item._id)">
                {{ item.isAvailable ? "ปิดขาย" : "เปิดขาย" }}
              </button>
              <button class="btn small" @click="openEditItem(item, cat._id)">แก้ไข</button>
              <button class="btn small btn-danger" @click="menu.deleteItem(item._id)">ลบ</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add category modal -->
    <div v-if="showCategoryModal" class="modal-backdrop" @click.self="showCategoryModal = false">
      <div class="modal card">
        <h3>เพิ่มหมวดหมู่ใหม่</h3>
        <label>ชื่อหมวดหมู่</label>
        <input v-model="newCategoryName" placeholder="เช่น ของทานเล่น" />
        <div class="modal-actions">
          <button class="btn" @click="showCategoryModal = false">ยกเลิก</button>
          <button class="btn btn-accent" @click="addCategory">เพิ่ม</button>
        </div>
      </div>
    </div>

    <!-- Add/edit item modal -->
    <div v-if="showItemModal" class="modal-backdrop" @click.self="showItemModal = false">
      <div class="modal card">
        <h3>{{ editingItemId ? "แก้ไขเมนูอาหาร" : "เพิ่มเมนูอาหารใหม่" }}</h3>

        <label>ชื่อเมนู *</label>
        <input v-model="form.name" placeholder="เช่น ผัดไทยกุ้งสด" />

        <label>คำอธิบาย</label>
        <input v-model="form.description" placeholder="รายละเอียดสั้นๆ" />

        <label>ราคา (บาท) *</label>
        <input v-model.number="form.price" type="number" min="0" step="1" />

        <label>หมวดหมู่ *</label>
        <select v-model="form.categoryId">
          <option v-for="cat in menu.categories" :key="cat._id" :value="cat._id">{{ cat.name }}</option>
        </select>

        <label>สถานีครัว</label>
        <select v-model="form.station">
          <option value="kitchen">ครัว</option>
          <option value="grill">Grill</option>
          <option value="drink">เครื่องดื่ม</option>
          <option value="dessert">ของหวาน</option>
        </select>

        <label>รูปภาพอาหาร</label>
        <div class="image-upload-section">
          <div v-if="form.imageUrl" class="image-preview">
            <img :src="form.imageUrl" :alt="form.name" />
            <button type="button" class="btn-remove-image" @click="form.imageUrl = ''"><i class="fa-solid fa-trash"></i></button>
          </div>
          <label class="file-input-label">
            <input 
              type="file" 
              accept="image/*" 
              @change="handleImageUpload" 
              :disabled="uploadingImage"
            />
            <span v-if="!uploadingImage"><i class="fa-solid fa-cloud-arrow-up"></i> คลิกเพื่ออัพโหลดรูป</span>
            <span v-else><i class="fa-solid fa-spinner"></i> กำลังอัพโหลด...</span>
          </label>
        </div>

        <div class="modal-actions">
          <button class="btn" @click="showItemModal = false">ยกเลิก</button>
          <button class="btn btn-accent" @click="submitItem">
            {{ editingItemId ? "บันทึกการแก้ไข" : "เพิ่มเมนู" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { useMenuStore } from "../stores/menu";
import axios from "axios";

const menu = useMenuStore();

const showCategoryModal = ref(false);
const newCategoryName = ref("");

const showItemModal = ref(false);
const editingItemId = ref(null);
const uploadingImage = ref(false);
const form = reactive({
  name: "",
  description: "",
  price: 0,
  categoryId: "",
  station: "kitchen",
  imageUrl: "",
});

const STATION_LABELS = { kitchen: "ครัว", grill: "Grill", drink: "เครื่องดื่ม", dessert: "ของหวาน" };
function stationLabel(s) {
  return STATION_LABELS[s] || s;
}

onMounted(() => menu.loadMenu());

async function addCategory() {
  if (!newCategoryName.value.trim()) return;
  await menu.addCategory(newCategoryName.value.trim());
  newCategoryName.value = "";
  showCategoryModal.value = false;
}

function resetForm() {
  Object.assign(form, { name: "", description: "", price: 0, categoryId: menu.categories[0]?._id || "", station: "kitchen", imageUrl: "" });
}

async function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  uploadingImage.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/upload` : "http://localhost:4000/api/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (response.data.url) {
      form.imageUrl = response.data.url;
    }
  } catch (error) {
    console.error("Image upload error:", error);
    alert("อัพโหลดรูปภาพล้มเหลว");
  } finally {
    uploadingImage.value = false;
    event.target.value = "";
  }
}

function openAddItem() {
  if (menu.categories.length === 0) {
    alert("กรุณาเพิ่มหมวดหมู่ก่อนเพิ่มเมนูอาหาร");
    return;
  }
  editingItemId.value = null;
  resetForm();
  showItemModal.value = true;
}

function openEditItem(item, categoryId) {
  editingItemId.value = item._id;
  Object.assign(form, {
    name: item.name,
    description: item.description,
    price: item.price,
    categoryId,
    station: item.station,
    imageUrl: item.imageUrl || "",
  });
  showItemModal.value = true;
}

async function submitItem() {
  if (!form.name.trim() || !form.categoryId || form.price < 0) {
    alert("กรุณากรอกชื่อเมนู, ราคา, และเลือกหมวดหมู่");
    return;
  }
  if (editingItemId.value) {
    await menu.updateItem(editingItemId.value, { ...form });
  } else {
    await menu.addItem({ ...form });
  }
  showItemModal.value = false;
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
h2 {
  font-size: 22px;
  color: var(--accent);
}
.actions {
  display: flex;
  gap: 8px;
}
.empty {
  color: var(--muted);
  padding: 40px 0;
}
.empty.small {
  padding: 10px 0 16px;
  font-size: 12.5px;
}
.cat-block {
  margin-bottom: 28px;
}
.cat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.cat-title {
  font-size: 16px;
  color: var(--text);
}
.link-btn {
  background: none;
  font-size: 12px;
  color: var(--muted);
}
.link-btn.danger {
  color: var(--danger);
}
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.item-card {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.item-card.unavailable {
  opacity: 0.6;
}

/* Image Section */
.item-image-wrapper {
  width: 100%;
  height: 140px;
  background: var(--panel-2);
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}
.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.item-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 28px;
}

/* Content Section */
.item-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.item-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}
.item-name {
  font-weight: 700;
  font-size: 13px;
  color: var(--text);
}
.item-desc {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.item-price {
  color: var(--accent);
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.item-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  padding: 4px 8px;
  font-size: 10.5px;
  border-radius: 4px;
  background: var(--panel-2);
  color: var(--muted);
}
.chip-available {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}
.chip-cancelled {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
}
.station-chip {
  background: var(--panel-2);
  color: var(--muted);
}

.item-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
}
.btn.small {
  padding: 6px 9px;
  font-size: 10.5px;
  flex: 1;
  min-width: 60px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}
.modal {
  padding: 24px;
  width: 100%;
  max-width: 380px;
  max-height: 85vh;
  overflow-y: auto;
}
.modal h3 {
  margin-bottom: 6px;
}
.modal label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin: 12px 0 6px;
}
.modal input,
.modal select {
  width: 100%;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 13.5px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

/* Image Upload Section */
.image-upload-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--panel-2);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-remove-image {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
}

.btn-remove-image:hover {
  background: rgba(0, 0, 0, 0.9);
}

.file-input-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 2px dashed var(--line);
  border-radius: 8px;
  background: var(--panel-2);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.file-input-label:hover {
  border-color: var(--accent);
  color: var(--text);
  background: var(--panel);
}

.file-input-label input {
  display: none;
}

.file-input-label input:disabled + span {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-input-label span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.file-input-label i {
  margin: 0;
}
</style>
