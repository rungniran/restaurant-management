<template>
  <header class="top-bar">
    <button class="back-btn" @click="goBack">← กลับ</button>
    <h1 class="page-title">ตะกร้าของคุณ</h1>
    <span style="width:40px" />
  </header>

  <main class="cart-body">
    <div v-if="cartStore.cart.length === 0" class="empty-state">
      <p>ตะกร้าว่างเปล่า</p>
      <button class="btn-primary" @click="goBack">เลือกเมนู</button>
    </div>

    <div v-else>
      <div v-for="line in cartStore.cart" :key="line.lineId" class="cart-line card">
        <div class="line-main">
          <div class="line-name">{{ line.menuItem.name }}</div>
          <div v-if="line.selectedOptions?.length" class="line-opts">
            {{ line.selectedOptions.map((o) => o.choice).join(", ") }}
          </div>
          <div v-if="line.note" class="line-note">หมายเหตุ: {{ line.note }}</div>
        </div>
        <div class="line-side">
          <div class="qty-control">
            <button @click="cartStore.updateQuantity(line.lineId, line.quantity - 1)">−</button>
            <span>{{ line.quantity }}</span>
            <button @click="cartStore.updateQuantity(line.lineId, line.quantity + 1)">+</button>
          </div>
          <div class="line-price">฿{{ lineTotal(line) }}</div>
          <button class="remove-btn" @click="cartStore.removeFromCart(line.lineId)">ลบ</button>
        </div>
      </div>

      <div class="summary card">
        <div class="summary-row">
          <span>ยอดรวม</span>
          <span>฿{{ cartStore.cartTotal }}</span>
        </div>
        <p class="summary-note">* ค่าบริการและภาษีจะคำนวณตอนเช็คบิล</p>
      </div>

      <p v-if="cartStore.error" class="error-text">{{ cartStore.error }}</p>
    </div>
  </main>

  <div v-if="cartStore.cart.length > 0" class="bottom-nav">
    <button class="btn-primary" style="flex:1" :disabled="cartStore.submitting" @click="submit">
      {{ cartStore.submitting ? "กำลังส่งออเดอร์..." : `ยืนยันสั่งอาหาร · ฿${cartStore.cartTotal}` }}
    </button>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useCartStore, lineTotal } from "../stores/cart";

const props = defineProps({ qrToken: String });
const router = useRouter();
const cartStore = useCartStore();

function goBack() {
  router.push({ name: "menu", params: { qrToken: props.qrToken } });
}

async function submit() {
  try {
    await cartStore.submitOrder();
    router.push({ name: "status", params: { qrToken: props.qrToken } });
  } catch {
    // error shown inline
  }
}
</script>

<style scoped>
.back-btn {
  background: none;
  color: var(--cream);
  font-weight: 600;
  font-size: 14px;
}
.page-title {
  color: var(--cream);
  font-size: 17px;
}
.cart-body {
  padding: 16px 18px 100px;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7268;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.cart-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
  margin-bottom: 10px;
}
.line-name {
  font-weight: 600;
  font-size: 14.5px;
}
.line-opts,
.line-note {
  font-size: 12.5px;
  color: #6b7268;
  margin-top: 3px;
}
.line-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.qty-control {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--cream);
  border-radius: 8px;
  padding: 4px 10px;
}
.qty-control button {
  background: none;
  font-size: 15px;
  color: var(--forest);
}
.line-price {
  font-weight: 700;
  color: var(--marigold-deep);
  font-size: 13.5px;
}
.remove-btn {
  background: none;
  color: var(--chili);
  font-size: 12px;
}
.summary {
  padding: 14px;
  margin-top: 6px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  font-size: 16px;
}
.summary-note {
  font-size: 11.5px;
  color: #6b7268;
  margin: 6px 0 0;
}
.error-text {
  color: var(--chili);
  font-size: 13px;
  margin-top: 10px;
}
</style>
