// Service for sending notification to LINE Notify staff group
export async function sendLineNotification(token, message) {
  if (!token || !message) return false;

  try {
    const params = new URLSearchParams();
    params.append("message", message);

    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await res.json();
    return data.status === 200;
  } catch (err) {
    console.error("LINE Notify error:", err.message);
    return false;
  }
}
