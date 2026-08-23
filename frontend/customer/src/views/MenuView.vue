<template>
  <div v-if="tableStore.loading" class="loading-state">กำลังโหลดเมนู...</div>

  <div v-else-if="tableStore.error" class="loading-state error">
    {{ tableStore.error }}
  </div>

  <template v-else>
    <header class="top-bar">
      <div class="brand-block">
        <div class="eyebrow"><i class="fa-solid fa-utensils"></i> โต๊ะ</div>
        <h1 class="table-num">{{ tableStore.table?.tableNumber }}</h1>
      </div>
      <button class="call-btn" @click="callStaff"><i class="fa-solid fa-bell"></i> เรียกพนักงาน</button>
    </header>

    <div class="search-wrap">
      <i class="fa-solid fa-magnifying-glass search-icon"></i>
      <input v-model="search" type="text" placeholder="ค้นหาเมนูโปรดของคุณ..." class="search-input" />
    </div>

    <nav class="cat-tabs">
      <button
        v-for="cat in cartStore.categories"
        :key="cat._id"
        class="cat-tab"
        :class="{ active: activeCat === cat._id }"
        @click="scrollTo(cat._id)"
      >
        {{ cat.name }}
      </button>
    </nav>

    <main class="menu-body">
      <section v-for="cat in filteredCategories" :key="cat._id" :id="`cat-${cat._id}`" class="cat-section">
        <h2 class="cat-title">{{ cat.name }}</h2>
        <div class="items-grid">
          <button
            v-for="item in cat.items"
            :key="item._id"
            class="item-card"
            :class="{ disabled: !item.isAvailable }"
            :disabled="!item.isAvailable"
            @click="openItem(item)"
          >
            <div class="item-img" v-if="item.imageUrl">
              <img :src="item.imageUrl" :alt="item.name" />
            </div>
            <div class="item-img placeholder" v-else><i class="fa-solid fa-bowl-food"></i></div>
            <div class="item-info">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-desc">{{ item.description }}</div>
              <div class="item-price-row">
                <span class="item-price">฿{{ item.price }}</span>
                <span v-if="!item.isAvailable" class="chip chip-cancelled">หมด</span>
                <template v-else-if="!item.options?.length">
                  <span v-if="qtyInCart(item) === 0" class="quick-add" @click.stop="quickAdd(item)"><i class="fa-solid fa-plus"></i> เพิ่ม</span>
                  <span v-else class="quick-stepper" @click.stop>
                    <button @click="decrement(item)">−</button>
                    <span class="qty-num">{{ qtyInCart(item) }}</span>
                    <button @click="quickAdd(item)">+</button>
                  </span>
                </template>
              </div>
            </div>
          </button>
        </div>
      </section>

      <div v-if="filteredCategories.length === 0" class="no-result">
        <i class="fa-solid fa-utensils"></i>
        <p>ไม่พบเมนูที่ค้นหา</p>
      </div>
    </main>

    <ItemOptionsSheet v-if="selectedItem" :item="selectedItem" @close="selectedItem = null" @add="onAdd" />

    <div class="bottom-nav">
      <button class="btn-secondary" style="flex:1" @click="goStatus">
        <i class="fa-solid fa-clipboard"></i> ออเดอร์ ({{ tableStore.activeOrders.length }})
      </button>
      <button class="btn-primary cart-btn" style="flex:1.3" @click="goCart" :disabled="cartStore.cart.length === 0">
        <i class="fa-solid fa-cart-shopping"></i> ตะกร้า
        <span v-if="cartStore.cartCount" class="cart-badge">{{ cartStore.cartCount }}</span>
        <span class="cart-total">฿{{ cartStore.cartTotal }}</span>
      </button>
    </div>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useTableStore } from "../stores/table";
import { useCartStore } from "../stores/cart";
import ItemOptionsSheet from "../components/ItemOptionsSheet.vue";

const props = defineProps({ qrToken: String });
const router = useRouter();
const tableStore = useTableStore();
const cartStore = useCartStore();

const search = ref("");
const selectedItem = ref(null);
const activeCat = ref(null);

const filteredCategories = computed(() => {
  if (!search.value.trim()) return cartStore.categories;
  const q = search.value.trim().toLowerCase();
  return cartStore.categories
    .map((cat) => ({ ...cat, items: cat.items.filter((i) => i.name.toLowerCase().includes(q)) }))
    .filter((cat) => cat.items.length > 0);
});

onMounted(async () => {
  await tableStore.loadTable(props.qrToken);
  if (tableStore.restaurantId) {
    await cartStore.loadMenu(tableStore.restaurantId);
    activeCat.value = cartStore.categories[0]?._id;
  }
});

function scrollTo(catId) {
  activeCat.value = catId;
  document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openItem(item) {
  if (!item.isAvailable) return;
  if (!item.options?.length) {
    quickAdd(item);
    return;
  }
  selectedItem.value = item;
}

function qtyInCart(item) {
  return cartStore.cart
    .filter((l) => l.menuItem._id === item._id && (!l.selectedOptions || l.selectedOptions.length === 0))
    .reduce((sum, l) => sum + l.quantity, 0);
}

function quickAdd(item) {
  const existing = cartStore.cart.find(
    (l) => l.menuItem._id === item._id && (!l.selectedOptions || l.selectedOptions.length === 0)
  );
  if (existing) {
    cartStore.updateQuantity(existing.lineId, existing.quantity + 1);
  } else {
    cartStore.addToCart({ menuItem: item, quantity: 1, selectedOptions: [], note: "" });
  }
}

function decrement(item) {
  const existing = cartStore.cart.find(
    (l) => l.menuItem._id === item._id && (!l.selectedOptions || l.selectedOptions.length === 0)
  );
  if (!existing) return;
  if (existing.quantity <= 1) cartStore.removeFromCart(existing.lineId);
  else cartStore.updateQuantity(existing.lineId, existing.quantity - 1);
}

function onAdd(payload) {
  cartStore.addToCart(payload);
}

function callStaff() {
  tableStore.callStaff("call_staff");
  alert("เรียกพนักงานแล้ว กรุณารอสักครู่");
}

function goCart() {
  router.push({ name: "cart", params: { qrToken: props.qrToken } });
}

function goStatus() {
  router.push({ name: "status", params: { qrToken: props.qrToken } });
}
</script>

<style scoped>
.loading-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}
.loading-state.error {
  color: var(--chili);
}
.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
}
.eyebrow {
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.4px;
}
.table-num {
  color: var(--ink);
  font-size: 21px;
  margin-top: 2px;
}
.call-btn {
  background: var(--paper);
  color: var(--ink);
  font-weight: 600;
  padding: 8px 14px;
  font-size: 13px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  transition: border-color 0.15s var(--ease), background 0.15s var(--ease);
}
.call-btn:hover {
  border-color: var(--ink);
  background: var(--cream);
}
.search-wrap {
  position: relative;
  padding: 16px 18px 14px;
}
.search-icon {
  position: absolute;
  left: 32px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 13px;
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 11px 14px 11px 36px;
  border: 1px solid var(--line);
  background: var(--cream);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: var(--ink);
  transition: border-color 0.15s var(--ease), background 0.15s var(--ease);
}
.search-input::placeholder {
  color: var(--muted);
}
.search-input:focus {
  outline: none;
  border-color: var(--ink);
  background: var(--paper);
}
.cat-tabs {
  position: sticky;
  top: 74px;
  z-index: 15;
  background: var(--paper);
  display: flex;
  gap: 22px;
  overflow-x: auto;
  padding: 0 18px;
  border-bottom: 1px solid var(--line);
}
.cat-tab {
  background: none;
  color: var(--muted);
  padding: 0 0 12px;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s var(--ease), border-color 0.15s var(--ease);
}
.cat-tab.active {
  background: none;
  color: var(--ink);
  border-bottom: 2px solid var(--ink);
}
.menu-body {
  padding: 4px 18px 24px;
}
.cat-section {
  margin-top: 24px;
  scroll-margin-top: 130px;
}
.cat-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 0.1px;
}
.items-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item-card {
  display: flex;
  gap: 12px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px;
  text-align: left;
  align-items: flex-start;
  box-shadow: none;
  transition: border-color 0.15s var(--ease), transform 0.1s var(--ease);
}
.item-card:not(.disabled):active {
  transform: scale(0.99);
  border-color: var(--muted);
}
.item-card.disabled {
  opacity: 0.5;
}
.item-img {
  width: 62px;
  height: 62px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--cream);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--muted);
}
.item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.item-info {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-weight: 600;
  font-size: 14.5px;
  color: var(--ink);
}
.item-desc {
  font-size: 12.5px;
  color: var(--muted);
  margin: 2px 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.item-price {
  color: var(--ink);
  font-weight: 700;
  font-size: 14px;
}
.quick-add {
  background: none;
  color: var(--ink);
  font-weight: 600;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1.5px solid var(--ink);
  transition: background 0.15s var(--ease), color 0.15s var(--ease);
}
.quick-add:active {
  background: var(--ink);
  color: #fff;
}
.quick-stepper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ink);
  border-radius: 999px;
  padding: 4px 10px;
}
.quick-stepper button {
  background: none;
  color: #fff;
  font-size: 15px;
  width: 18px;
  line-height: 1;
}
.quick-stepper .qty-num {
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  min-width: 12px;
  text-align: center;
}
.no-result {
  padding: 60px 20px;
  text-align: center;
  color: var(--muted);
}
.no-result i {
  font-size: 28px;
  margin-bottom: 10px;
  display: block;
}
</style>
