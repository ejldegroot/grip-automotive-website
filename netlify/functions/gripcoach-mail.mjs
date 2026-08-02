// Gedeelde mail-opbouw: één nette mail met het volledige GripCoach-gesprek (via Resend).

export async function sendConversationMail(conv) {
  const mailKey = process.env.RESEND_API_KEY;
  if (!mailKey) return false;
  const shortId = String(conv.conversation_id || "onbekend").slice(0, 8);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bubble = (role, text) =>
    `<p style="margin:0 0 12px;"><strong style="color:${role === "user" ? "#243755" : "#4A6FA5"};">${role === "user" ? "Bezoeker" : "GripCoach"}:</strong><br>${esc(text).replace(/\n/g, "<br>")}</p>`;
  const transcript = (conv.messages || []).map((m) => bubble(m.role, m.content)).join("");
  const vragen = conv.turns || (conv.messages || []).filter((m) => m.role === "user").length;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${mailKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.GRIPCOACH_MAIL_FROM || "GripCoach <gripcoach@grip-automotive.com>",
      to: [process.env.GRIPCOACH_MAIL_TO || "info@griplab.nl"],
      subject: `GripCoach-gesprek op de website (${vragen} ${vragen === 1 ? "vraag" : "vragen"}) — ${shortId}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;">`
        + `<h2 style="color:#243755;margin:0 0 4px;">GripCoach-gesprek ${shortId}</h2>`
        + `<p style="color:#6E7A87;margin:0 0 20px;">${vragen} ${vragen === 1 ? "vraag" : "vragen"} · volledig gesprek hieronder</p>`
        + transcript
        + `<p style="color:#6E7A87;font-size:13px;margin-top:24px;">Automatisch bericht van grip-automotive.com — verstuurd nadat het gesprek is afgerond.</p></div>`,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    console.error("GripCoach mail rejected:", res.status, (await res.text()).slice(0, 300));
    return false;
  }
  return true;
}
