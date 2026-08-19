<template>
  <div class="sheet-backdrop" @click.self="$emit('close')">
    <div class="sheet">
      <div class="sheet-handle" />
      <div class="sheet-header">
        <div>
          <h3>{{ item.name }}</h3>
          <p class="desc">{{ item.description }}</p>
        </div>
        <button class="close-btn" @click="$emit('close')" aria-label="ปิด">✕</button>
      </div>

      <div class="price-row">฿{{ item.price }}</div>

      <div v-for="group in item.options" :key="group.name" class="option-group">
        <div class="group-title">
          {{ group.name }}
          <span v-if="group.required" class="required">*จำเป็น</span>
        </div>
        <div class="choices">
          <label
            v-for="choice in group.choices"
            :key="choice.label"
            class="choice"
            :class="{ selected: isSelected(group, choice) }"
          >
            <input
              :type="group.type === 'single' ? 'radio' : 'checkbox'"
              :name="group.name"
              @change="toggleChoice(group, choice)"
              :checked="isSelected(group, choice)"
            />
            <span>{{ choice.label }}</span>
            <span v-if="choice.extraPrice" class="extra">+฿{{ choice.extraPrice }}</span>
          </label>
        </div>
      </div>

      <div class="option-group">
        <div class="group-title">หมายเหตุพิเศษ</div>
        <textarea v-model="note" placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย..." rows="2" />
      </div>

      <div class="qty-row">
        <span class="group-title">จำนวน</span>
        <div class="qty-control">
          <button @click="quantity = Math.max(1, quantity - 1)" aria-label="ลดจำนวน">−</button>
          <span>{{ quantity }}</span>
          <button @click="quantity++" aria-label="เพิ่มจำนวน">+</button>
        </div>
      </div>

      <button class="btn-primary add-btn" :disabled="!canAdd" @click="confirmAdd">
        เพิ่มลงตะกร้า · ฿{{ totalPrice }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({ item: { type: Object, required: true } });
const emit = defineEmits(["close", "add"]);

const quantity = ref(1);
const note = ref("");
const selected = ref({}); // { groupName: [choiceLabel, ...] }

function isSelected(group, choice) {
  return (selected.value[group.name] || []).includes(choice.label);
}

function toggleChoice(group, choice) {
  const current = selected.value[group.name] || [];
  if (group.type === "single") {
    selected.value[group.name] = [choice.label];
  } else if (current.includes(choice.label)) {
    selected.value[group.name] = current.filter((c) => c !== choice.label);
  } else {
    selected.value[group.name] = [...current, choice.label];
  }
}

const canAdd = computed(() =>
  (props.item.options || []).filter((g) => g.required).every((g) => (selected.value[g.name] || []).length > 0)
);

const selectedOptionsFlat = computed(() => {
  const out = [];
  for (const group of props.item.options || []) {
    for (const label of selected.value[group.name] || []) {
      const choice = group.choices.find((c) => c.label === label);
      out.push({ groupName: group.name, choice: label, extraPrice: choice?.extraPrice || 0 });
    }
  }
  return out;
});

const totalPrice = computed(() => {
  const extra = selectedOptionsFlat.value.reduce((s, o) => s + o.extraPrice, 0);
  return (props.item.price + extra) * quantity.value;
});

function confirmAdd() {
  if (!canAdd.value) return;
  emit("add", {
    menuItem: props.item,
    quantity: quantity.value,
    selectedOptions: selectedOptionsFlat.value,
    note: note.value,
  });
  emit("close");
}
</script>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(22, 40, 31, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 50;
}
.sheet {
  background: var(--paper);
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 20px 20px 0 0;
  padding: 10px 20px 24px;
  max-height: 85vh;
  overflow-y: auto;
}
.sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--line);
  border-radius: 2px;
  margin: 6px auto 14px;
}
.sheet-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.desc {
  color: #6b7268;
  font-size: 13px;
  margin: 4px 0 0;
}
.close-btn {
  background: var(--cream);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}
.price-row {
  font-family: "Chonburi", serif;
  color: var(--marigold-deep);
  font-size: 20px;
  margin: 10px 0;
}
.option-group {
  margin-top: 18px;
}
.group-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}
.required {
  color: var(--chili);
  font-size: 11px;
  font-weight: 500;
  margin-left: 4px;
}
.choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.choice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  font-size: 14px;
}
.choice.selected {
  border-color: var(--marigold);
  background: #fdf6e8;
}
.extra {
  margin-left: auto;
  color: var(--marigold-deep);
  font-size: 13px;
}
textarea {
  width: 100%;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  font-family: inherit;
  font-size: 14px;
  resize: none;
}
.qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
}
.qty-control {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--cream);
  border-radius: 10px;
  padding: 6px 14px;
}
.qty-control button {
  background: none;
  font-size: 18px;
  width: 24px;
  color: var(--forest);
}
.add-btn {
  width: 100%;
  margin-top: 20px;
}
</style>
