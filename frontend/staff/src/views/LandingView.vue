<template>
  <div class="landing-page">
    <div class="glow glow-one"></div>
    <div class="glow glow-two"></div>

    <header class="topbar">
      <div class="brand-wrap">
        <div class="brand-icon">Q</div>
        <div>
          <div class="brand-name">QR ร้าน</div>
          <small>ระบบจัดการร้านอาหาร</small>
        </div>
      </div>

      <div class="top-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'login' })">เข้าสู่ระบบ</button>
        <button class="btn btn-accent" @click="router.push({ name: 'sales-mode' })">เริ่มต้นร้าน</button>
      </div>
    </header>

    <main class="hero">
      <div class="hero-copy">
        <span class="eyebrow">ระบบจัดการร้านอาหาร ใช้งานผ่าน QR</span>
        <h1>รับออเดอร์เป็นระบบ <span>ดูแลร้านได้ง่ายขึ้น</span></h1>
        <p>
          ให้ลูกค้าสแกน QR เพื่อดูเมนูและสั่งอาหาร ส่งออเดอร์เข้าจอครัวแบบเรียลไทม์
          พร้อมจัดการโต๊ะ เมนู การชำระเงิน และบุฟเฟต์ได้ในที่เดียว
        </p>

        <div class="cta-row">
          <button class="btn btn-accent large" @click="router.push({ name: 'sales-mode' })">ทดลองใช้ฟรี 3 เดือน</button>
          <button class="btn btn-ghost large" @click="router.push({ name: 'login' })">เข้าสู่ระบบ</button>
        </div>

        <div class="mini-stats">
          <div>
            <strong>3 เดือน</strong>
            <small>ทดลองใช้ฟรีสำหรับร้านใหม่</small>
          </div>
          <div>
            <strong>2 รูปแบบ</strong>
            <small>ตามสั่งและบุฟเฟต์</small>
          </div>
          <div>
            <strong>QR ต่อโต๊ะ</strong>
            <small>ลูกค้าสั่งจากมือถือ</small>
          </div>
        </div>
      </div>

      <div class="hero-panel card">
        <div class="panel-header">
          <span class="dot green"></span>
          <span class="dot yellow"></span>
          <span class="dot red"></span>
        </div>

        <div class="mockup">
          <div class="mock-top">
            <div>
              <small>ตัวอย่างหน้าจอจัดการร้าน</small>
              <strong>ออเดอร์และโต๊ะ</strong>
            </div>
            <span class="pill">พร้อมใช้งาน</span>
          </div>

          <div class="stats-row">
            <div>
              <strong>จอครัว</strong>
              <small>รับรายการแบบเรียลไทม์</small>
            </div>
            <div>
              <strong>สรุปยอด</strong>
              <small>ดูเมนูขายดีและช่วงเวลาขาย</small>
            </div>
          </div>

          <ul class="checklist">
            <li class="done">ตั้งค่าร้านของคุณ</li>
            <li class="done">สร้างหมวดหมู่</li>
            <li class="done">เพิ่มอาหาร</li>
            <li>สร้างโต๊ะ & QR</li>
            <li>เชิญพนักงาน</li>
            <li>เปิดร้าน</li>
          </ul>

          <div class="preview-box">
            <div class="qr-box">QR</div>
            <div class="preview-text">
              <strong>สแกนสั่งเลย</strong>
              <small>ผ่านแอปลูกค้า</small>
            </div>
          </div>
        </div>
      </div>
    </main>

    <section class="value-section">
      <div class="value-heading">
        <span class="eyebrow alt">คุ้มตรงไหน</span>
        <h2>เลือกใช้ให้ตรงกับวิธีขายของร้าน</h2>
        <p>เริ่มจากรูปแบบการขายของคุณ แล้วตั้งค่าเมนู โต๊ะ และ QR ให้พร้อมก่อนเปิดรับออเดอร์</p>
      </div>
      <div class="comparison-grid">
        <div class="comparison-card highlight">
          <span class="comparison-label">คิดราคาตามรายการ</span>
          <h3>ร้านอาหารตามสั่ง</h3>
          <ul>
            <li>ลูกค้าสแกน QR เพื่อเลือกและสั่งเมนู</li>
            <li>ส่งออเดอร์เข้าจอครัวแบบเรียลไทม์</li>
            <li>รองรับการแยกบิลและชำระผ่าน PromptPay QR</li>
            <li>ดูยอดขายและเมนูยอดนิยม</li>
          </ul>
        </div>
        <div class="comparison-card">
          <span class="comparison-label">คิดราคาต่อคน</span>
          <h3>ร้านบุฟเฟต์</h3>
          <ul>
            <li>ตั้งราคาผู้ใหญ่ เด็ก และแพ็กเกจ</li>
            <li>กำหนดเวลารับประทานและต่อเวลา</li>
            <li>จัดการมัดจำและชำระค่าบุฟเฟต์</li>
            <li>ลูกค้าสั่งเมนูจาก QR ที่โต๊ะ</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="feature-card card">
        <div class="feature-icon">⚡</div>
        <h3>ระบบสั่งแบบรวดเร็ว</h3>
        <p>ลูกค้าสแกน QR แล้วสั่งได้ทันที ไม่ต้องรอพนักงาน พร้อมคำนวณยอดรวมอัตโนมัติ</p>
      </div>
      <div class="feature-card card">
        <div class="feature-icon"><i class="fa-solid fa-chart-column"></i></div>
        <h3>รายงานยอดขายชัดเจน</h3>
        <p>ดู KPI, เมนูขายดี, เวลาพีค และความเคลื่อนไหวของร้านแบบเรียลไทม์</p>
      </div>
      <div class="feature-card card">
        <div class="feature-icon"><i class="fa-solid fa-receipt"></i></div>
        <h3>ชำระเงินไร้รอยต่อ</h3>
        <p>รองรับการจ่ายเต็มบิล, หารเท่ากัน, เลือกจ่ายรายการ และ PromptPay QR</p>
      </div>
    </section>

    <section class="flow-section">
      <div class="section-header">
        <span class="eyebrow alt">How it works</span>
        <h2>เริ่มต้นใน 4 ขั้นตอน</h2>
      </div>

      <div class="timeline">
        <div class="timeline-step">
          <span>1</span>
          <h4>สมัครร้าน</h4>
          <p>สร้างร้านและตั้งค่าร้านให้พร้อมใช้งาน</p>
        </div>
        <div class="timeline-step">
          <span>2</span>
          <h4>เพิ่มเมนู & โต๊ะ</h4>
          <p>ตั้งหมวดหมู่, อาหาร, QR และโต๊ะให้ใช้งาน</p>
        </div>
        <div class="timeline-step">
          <span>3</span>
          <h4>เปิดให้บริการ</h4>
          <p>เปิดร้านให้ลูกค้าเข้ามาสั่งได้ทันที</p>
        </div>
        <div class="timeline-step">
          <span>4</span>
          <h4>ติดตามรายได้</h4>
          <p>ดูยอดขายและประสิทธิภาพแบบเรียลไทม์</p>
        </div>
      </div>
    </section>

    <section class="faq-section">
      <div class="section-header">
        <span class="eyebrow alt">คำถามที่พบบ่อย</span>
        <h2>เริ่มใช้งานอย่างไร?</h2>
      </div>
      <div class="faq-grid">
        <article class="faq-card">
          <h3>สมัครแล้วต้องทำอะไรต่อ?</h3>
          <p>เลือกรูปแบบการขาย สร้างบัญชีร้าน แล้วตั้งค่าเมนูและโต๊ะเพื่อสร้าง QR ก่อนเปิดรับออเดอร์</p>
        </article>
        <article class="faq-card">
          <h3>ร้านของฉันใช้ระบบนี้ได้ไหม?</h3>
          <p>เริ่มได้ทั้งร้านอาหารตามสั่งและร้านบุฟเฟต์ โดยเลือกรูปแบบที่ตรงกับวิธีคิดเงินของร้านตอนสมัคร</p>
        </article>
        <article class="faq-card">
          <h3>ทดลองใช้งานนานเท่าไร?</h3>
          <p>ร้านใหม่ทดลองใช้ฟรี 3 เดือน หลังจากนั้นต้องเปิดใช้แพ็กเกจแบบชำระเงินเพื่อใช้งานต่อ</p>
        </article>
        <article class="faq-card">
          <h3>หากพบปัญหาในการใช้งาน ติดต่อที่ไหน?</h3>
          <p>ติดต่อทีมงานผ่านเพจ Facebook QR ร้าน เรายินดีช่วยตรวจสอบและแนะนำวิธีแก้ไข</p>
        </article>
      </div>
      <div class="closing-cta card">
        <div>
          <span class="eyebrow">พร้อมเริ่มหรือยัง?</span>
          <h2>ลองจัดการออเดอร์ของร้านคุณ</h2>
          <p>สมัครร้าน เลือกรูปแบบการขาย แล้วเริ่มตั้งค่าได้เลย</p>
        </div>
        <button class="btn btn-accent large" @click="router.push({ name: 'sales-mode' })">เริ่มทดลองใช้ฟรี 3 เดือน</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<style scoped>
.landing-page {
  position: relative;
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(224,163,61,0.18), transparent 30%),
    radial-gradient(circle at bottom right, rgba(61,139,224,0.18), transparent 28%),
    #0b0d12;
  color: var(--text);
  padding: 24px 28px 56px;
  overflow: hidden;
}

.glow {
  position: absolute;
  filter: blur(80px);
  opacity: 0.35;
  pointer-events: none;
}
.glow-one {
  width: 300px;
  height: 300px;
  background: rgba(224,163,61,0.5);
  top: 80px;
  left: -40px;
}
.glow-two {
  width: 360px;
  height: 360px;
  background: rgba(61,139,224,0.45);
  bottom: 40px;
  right: -20px;
}

.topbar,
.hero,
.features,
.flow-section {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 20px;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #f7c76c, #e0a33d);
  color: #1f1300;
  font-weight: 800;
  box-shadow: 0 12px 28px rgba(224,163,61,0.38);
}

.brand-name {
  font-weight: 800;
  letter-spacing: 0.06em;
}

.brand-wrap small {
  color: var(--muted);
  font-size: 11px;
}

.top-actions {
  display: flex;
  gap: 12px;
}

.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 36px;
  align-items: center;
  padding-top: 18px;
}

.eyebrow {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(224,163,61,0.12);
  border: 1px solid rgba(224,163,61,0.35);
  color: #f8d087;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.eyebrow.alt {
  background: rgba(61,139,224,0.12);
  border-color: rgba(61,139,224,0.3);
  color: #9bc5ff;
}

.hero-copy h1 {
  margin: 18px 0 18px;
  font-size: clamp(2.8rem, 5vw, 5rem);
  line-height: 1.02;
  letter-spacing: -0.05em;
}

.hero-copy h1 span {
  color: var(--accent);
}

.hero-copy p {
  max-width: 620px;
  color: #c6ccd7;
  line-height: 1.8;
  font-size: 1.06rem;
}

.cta-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 28px;
}

.large {
  padding: 15px 24px;
  font-size: 0.98rem;
}

.mini-stats {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.mini-stats div,
.stats-row div {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 16px 18px;
}

.mini-stats strong,
.mini-stats small,
.stats-row strong,
.stats-row small {
  display: block;
}

.mini-stats strong,
.stats-row strong {
  font-size: 1.2rem;
  color: var(--text);
}

.mini-stats small,
.stats-row small {
  margin-top: 4px;
  color: var(--muted);
}

.hero-panel {
  padding: 18px 18px 14px;
  border-radius: 22px;
  background: rgba(27, 32, 40, 0.9);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 25px 50px rgba(0,0,0,0.32);
}

.panel-header {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
.dot.green { background: #34d399; }
.dot.yellow { background: #fbbf24; }
.dot.red { background: #f87171; }

.mockup {
  background: rgba(11, 15, 22, 0.82);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  padding: 18px;
}

.mock-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.mock-top small {
  display: block;
  color: var(--muted);
}

.pill {
  background: rgba(52, 211, 153, 0.12);
  color: #a9f3d0;
  border: 1px solid rgba(52, 211, 153, 0.42);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.checklist {
  list-style: none;
  padding: 0;
  margin: 18px 0 0;
  display: grid;
  gap: 10px;
}

.checklist li {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
  color: var(--muted);
}

.checklist li.done {
  border-color: rgba(52,211,153,0.4);
  background: rgba(52,211,153,0.08);
  color: #b9f7d5;
}

.preview-box {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 12px;
  border-radius: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
}

.qr-box {
  width: 86px;
  height: 86px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(224,163,61,0.16), rgba(61,139,224,0.12));
  border: 1px solid rgba(224,163,61,0.3);
  font-weight: 800;
  color: var(--accent);
}

.preview-text strong,
.preview-text small {
  display: block;
}

.preview-text small {
  margin-top: 4px;
  color: var(--muted);
}

.features {
  margin-top: 50px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.value-section {
  max-width: 980px;
  margin: 72px auto 0;
}
.value-heading {
  max-width: 680px;
  margin-bottom: 24px;
}
.value-heading h2 {
  margin: 12px 0 10px;
  font-size: clamp(1.8rem, 3vw, 3rem);
}
.value-heading p {
  color: var(--muted);
  line-height: 1.7;
  margin: 0;
}
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.comparison-card {
  padding: 24px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 18px;
  background: rgba(19,23,31,0.88);
}
.comparison-card.highlight {
  border-color: rgba(224,163,61,0.55);
  background: linear-gradient(145deg, rgba(224,163,61,0.14), rgba(19,23,31,0.92));
  box-shadow: 0 18px 40px rgba(0,0,0,0.2);
}
.comparison-label {
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.comparison-card h3 {
  margin: 10px 0 16px;
  font-size: 1.25rem;
}
.comparison-card ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 11px;
}
.comparison-card li {
  color: #c6ccd7;
  line-height: 1.5;
  padding-left: 22px;
  position: relative;
}
.comparison-card li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--success);
  font-weight: 800;
}

.feature-card {
  padding: 24px 20px;
  background: rgba(19,23,31,0.9);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
}

.feature-icon {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(224,163,61,0.2), rgba(61,139,224,0.12));
  margin-bottom: 16px;
  font-size: 1.4rem;
}

.feature-card h3 {
  margin: 0 0 12px;
  font-size: 1.18rem;
}

.feature-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.flow-section {
  margin-top: 52px;
}

.faq-section {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 64px auto 0;
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.faq-card {
  padding: 22px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(19,23,31,0.88);
}

.faq-card h3 { margin: 0 0 10px; font-size: 1.05rem; }
.faq-card p { margin: 0; color: var(--muted); line-height: 1.7; }

.closing-cta {
  margin-top: 28px;
  padding: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: linear-gradient(120deg, rgba(224,163,61,0.14), rgba(19,23,31,0.92));
}

.closing-cta h2 { margin: 12px 0 6px; }
.closing-cta p { margin: 0; color: var(--muted); }

.section-header {
  text-align: center;
  margin-bottom: 24px;
}
.section-header h2 {
  margin-top: 10px;
  font-size: clamp(1.8rem, 2.8vw, 3rem);
}

.timeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.timeline-step {
  padding: 22px 18px;
  border-radius: 18px;
  background: rgba(19,23,31,0.88);
  border: 1px solid rgba(255,255,255,0.08);
}

.timeline-step span {
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e0a33d, #d77f31);
  color: #1f1200;
  font-weight: 800;
}

.timeline-step h4 {
  margin: 16px 0 10px;
  font-size: 1.06rem;
}

.timeline-step p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

@media (max-width: 900px) {
  .hero,
  .features,
  .timeline,
  .comparison-grid,
  .faq-grid {
    grid-template-columns: 1fr;
  }

  .closing-cta { align-items: flex-start; flex-direction: column; }
}
</style>
