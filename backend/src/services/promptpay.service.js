// Generates a PromptPay-compliant EMV QR payload string.
// Frontend renders this string as a QR code image (e.g. using `qrcode` package or a Vue QR component).

function padLeft(str, len, ch = "0") {
  str = String(str);
  return str.length >= len ? str : ch.repeat(len - str.length) + str;
}

function formatField(id, value) {
  const len = padLeft(value.length, 2);
  return `${id}${len}${value}`;
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return padLeft(crc.toString(16).toUpperCase(), 4);
}

/**
 * @param {string} target - PromptPay ID: phone number (10 digit, e.g. 0812345678) or national ID (13 digit)
 * @param {number} amount - amount in THB, e.g. 580.50
 */
export function generatePromptPayPayload(target, amount) {
  const isPhone = target.replace(/[^0-9]/g, "").length <= 10;
  let formattedTarget = target.replace(/[^0-9]/g, "");

  if (isPhone) {
    // convert to 0066XXXXXXXXX format (13 digits, drop leading 0)
    formattedTarget = "0066" + formattedTarget.substring(1);
  }

  const merchantAccountInfo =
    formatField("00", "A000000677010111") +
    formatField(isPhone ? "01" : "02", formattedTarget);

  let payload =
    formatField("00", "01") + // payload format indicator
    formatField("01", amount ? "12" : "11") + // point of initiation: 12=dynamic(with amount), 11=static
    formatField("29", merchantAccountInfo) +
    formatField("53", "764") + // currency: THB
    (amount ? formatField("54", amount.toFixed(2)) : "") +
    formatField("58", "TH");

  payload += "6304"; // CRC placeholder id+len
  const checksum = crc16(payload);
  return payload + checksum;
}
