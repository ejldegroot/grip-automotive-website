// Scheduled functie: draait elk kwartier. Gesprekken die ~20 minuten stil zijn
// worden als één samenvattende mail verstuurd en daarna uit de buffer verwijderd.

import { getStore } from "@netlify/blobs";
import { sendConversationMail } from "./gripcoach-mail.mjs";

const IDLE_MS = 20 * 60 * 1000;

export default async () => {
  const store = getStore("gripcoach-gesprekken");
  let sent = 0, waiting = 0;
  try {
    const { blobs } = await store.list();
    for (const b of blobs) {
      let conv;
      try {
        conv = await store.get(b.key, { type: "json" });
      } catch { continue; }
      if (!conv || !Array.isArray(conv.messages) || conv.messages.length === 0) {
        await store.delete(b.key);
        continue;
      }
      if (Date.now() - (conv.last_activity || 0) < IDLE_MS) { waiting++; continue; }
      const ok = await sendConversationMail(conv);
      if (ok) {
        await store.delete(b.key);
        sent++;
      }
    }
    console.log(`GripCoach digest: ${sent} mail(s) verstuurd, ${waiting} gesprek(ken) nog actief.`);
  } catch (e) {
    console.error("GripCoach digest error:", e.message);
  }
  return new Response(JSON.stringify({ sent, waiting }), { headers: { "Content-Type": "application/json" } });
};

export const config = { schedule: "*/15 * * * *" };
