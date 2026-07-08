"use client";

import { useState } from "react";
import { Modal } from "@/core/ui/Modal";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { useToast } from "@/core/ui/Toast";
import { sendTournamentReminder } from "@/modules/admin/actions";

// Manual only — the admin composes and sends by hand, on demand. No automatic
// or scheduled sending.
export function TournamentReminderPanel({ tournamentId }: { tournamentId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    const result = await sendTournamentReminder(tournamentId, subject, message);
    setLoading(false);
    if ("error" in result) {
      toast(result.error, "error");
      return;
    }
    toast(`Reminder sent to ${result.sent} participant${result.sent === 1 ? "" : "s"}`, "success");
    setOpen(false);
    setSubject("");
    setMessage("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full rounded-xl border border-gray-700 bg-[#0b0e14] py-2.5 text-center text-[10px] text-gray-300 transition-colors hover:border-[var(--color-accent)]/50 hover:text-white"
      >
        Send Reminder Email
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Send Tournament Reminder">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Sends once, to every registered participant, right now. Nothing automatic.
          </p>
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Check-in opens in 1 hour"
          />
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Reminder: your match starts soon, make sure you're checked in..."
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} isLoading={loading} disabled={!subject.trim() || !message.trim()}>
              Send Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
