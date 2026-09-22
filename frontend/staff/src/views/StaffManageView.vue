<template>
  <div class="page">
    <header class="page-header">
      <h2 class="display">จัดการพนักงาน</h2>
      <button class="btn btn-accent" @click="openCreate">+ เพิ่มพนักงาน</button>
    </header>

    <p v-if="staffStore.error" class="error-text">{{ staffStore.error }}</p>

    <div v-if="staffStore.loading" class="empty">กำลังโหลด...</div>
    <div v-else-if="staffStore.list.length === 0" class="empty">ยังไม่มีพนักงานในระบบ</div>

    <div class="list">
      <div v-for="s in staffStore.list" :key="s._id" class="staff-card card" :class="{ inactive: !s.isActive }">
        <div class="staff-top">
          <div class="staff-identity">
            <img v-if="s.avatarUrl" :src="s.avatarUrl" :alt="s.name" class="staff-avatar" />
            <div v-else class="staff-avatar staff-avatar-fallback"><i class="fa-solid fa-user"></i></div>
            <div>
            <div class="staff-name">
              {{ s.name }}
              <span v-if="s._id === auth.staff?.id" class="you-tag">คุณ</span>
            </div>
            <div class="staff-meta">@{{ s.username }}</div>
            </div>
          </div>
          <span class="chip" :class="`role-${s.role}`">{{ roleLabel(s.role) }}</span>
        </div>

        <div class="staff-status">
          <span v-if="!s.isActive" class="chip chip-cancelled">ปิดการใช้งาน</span>
          <span v-else-if="s.mustChangePassword" class="chip chip-pending">รอเปลี่ยนรหัสผ่านครั้งแรก</span>
          <span v-else class="chip chip-ready">ใช้งานปกติ</span>
        </div>

        <div class="staff-actions">
          <button class="btn small" @click="openEdit(s)" :disabled="!canManage(s)">แก้ไข</button>
          <button
            class="btn small"
            @click="toggleActive(s)"
            :disabled="!canManage(s) || s._id === auth.staff?.id"
          >
            {{ s.isActive ? "ปิดการใช้งาน" : "เปิดใช้งาน" }}
          </button>
          <button
            class="btn small btn-danger"
            @click="remove(s)"
            :disabled="!canManage(s) || s._id === auth.staff?.id"
          >
            ลบ
          </button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal card">
        <h3>{{ editing ? "แก้ไขพนักงาน" : "เพิ่มพนักงานใหม่" }}</h3>

        <label>ชื่อ</label>
        <input v-model="form.name" placeholder="ชื่อพนักงาน" />

        <label>Username</label>
        <input v-model="form.username" placeholder="username สำหรับเข้าสู่ระบบ" :disabled="!!editing" />

        <label>{{ editing ? "ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่านเริ่มต้น" }}</label>
        <input v-model="form.password" type="text" placeholder="อย่างน้อย 8 ตัวอักษร" />

        <label>ตำแหน่ง</label>
        <select v-model="form.role">
          <option value="waiter">พนักงานเสิร์ฟ</option>
          <option value="kitchen">ครัว</option>
          <option value="cashier">แคชเชียร์</option>
          <option value="manager">ผู้จัดการ</option>
          <option v-if="auth.staff?.role === 'owner'" value="owner">เจ้าของร้าน</option>
        </select>

        <p v-if="staffStore.error" class="error-text">{{ staffStore.error }}</p>

        <div class="modal-actions">
          <button class="btn" @click="closeModal">ยกเลิก</button>
          <button class="btn btn-accent" :disabled="submitting" @click="submit">
            {{ submitting ? "กำลังบันทึก..." : editing ? "บันทึก" : "เพิ่มพนักงาน" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { useStaffStore } from "../stores/staffAccounts";
import { useAuthStore } from "../stores/auth";

const staffStore = useStaffStore();
const auth = useAuthStore();

const showModal = ref(false);
const editing = ref(null); // the staff object being edited, or null when creating
const submitting = ref(false);

const form = reactive({ name: "", username: "", password: "", role: "waiter" });

const ROLE_LABELS = {
  owner: "เจ้าของร้าน",
  manager: "ผู้จัดการ",
  cashier: "แคชเชียร์",
  waiter: "พนักงานเสิร์ฟ",
  kitchen: "ครัว",
};
function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

// Managers may not edit/deactivate/delete an owner's account — mirrors the
// server-side rule so the buttons don't just fail with a 403 after the fact.
function canManage(staff) {
  if (staff.role === "owner" && auth.staff?.role !== "owner") return false;
  return true;
}

onMounted(() => {
  staffStore.loadStaff();
});

function openCreate() {
  editing.value = null;
  Object.assign(form, { name: "", username: "", password: "", role: "waiter" });
  staffStore.error = null;
  showModal.value = true;
}

function openEdit(staff) {
  editing.value = staff;
  Object.assign(form, { name: staff.name, username: staff.username, password: "", role: staff.role });
  staffStore.error = null;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function submit() {
  if (!form.name || !form.username) {
    staffStore.error = "กรุณากรอกชื่อและ username";
    return;
  }
  if (!editing.value && (!form.password || form.password.length < 8)) {
    staffStore.error = "กรุณาตั้งรหัสผ่านเริ่มต้นอย่างน้อย 8 ตัวอักษร";
    return;
  }
  if (form.password && form.password.length > 0 && form.password.length < 8) {
    staffStore.error = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    return;
  }

  submitting.value = true;
  let ok;
  if (editing.value) {
    const payload = { name: form.name, role: form.role };
    if (form.password) payload.password = form.password;
    ok = await staffStore.updateStaff(editing.value._id, payload);
  } else {
    ok = await staffStore.createStaff({
      name: form.name,
      username: form.username,
      password: form.password,
      role: form.role,
    });
  }
  submitting.value = false;

  if (ok) showModal.value = false;
}

async function toggleActive(staff) {
  await staffStore.updateStaff(staff._id, { isActive: !staff.isActive });
}

async function remove(staff) {
  if (!confirm(`ยืนยันลบพนักงาน "${staff.name}"? การกระทำนี้ย้อนกลับไม่ได้`)) return;
  await staffStore.deleteStaff(staff._id);
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
h2 {
  font-size: 22px;
  color: var(--accent);
}
.empty {
  color: var(--muted);
  padding: 40px 0;
}
.error-text {
  color: var(--danger);
  font-size: 13px;
  margin: 0 0 12px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.staff-card {
  padding: 14px 16px;
}
.staff-card.inactive {
  opacity: 0.55;
}
.staff-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.staff-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}
.staff-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid var(--line);
}
.staff-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--panel-2);
  color: var(--muted);
}
.staff-name {
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.you-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 999px;
  padding: 1px 7px;
}
.staff-meta {
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 2px;
}
.staff-status {
  margin-top: 10px;
}
.chip-ready {
  background: rgba(74, 222, 128, 0.12);
  color: #4ade80;
}
.chip-pending {
  background: rgba(224, 163, 61, 0.14);
  color: var(--accent);
}
.staff-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.btn.small {
  padding: 6px 12px;
  font-size: 12px;
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
  font-size: 14px;
  font-family: inherit;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
