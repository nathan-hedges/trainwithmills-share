/**
 * Shared messaging DTOs - the contract between the messaging API and the chat UI.
 */

export type SenderRole = "coach" | "client";
export type Verdict = "good" | "needs_work";

export interface MessageDTO {
  id: string;
  senderRole: SenderRole;
  text: string;
  videoKey: string | null; // present if a video is attached; UI fetches a signed URL to play it
  verdict: Verdict | null; // coach's structured feedback on the video
  verdictNote: string | null;
  createdAt: string;
  mine: boolean; // true if the signed-in user sent it (so the UI knows which side to render)
}

// One row in the coach's /admin/messages inbox.
export interface ThreadSummary {
  clientId: string;
  clientName: string;
  initials: string;
  lastMessage: string; // preview text, or "📹 Video" for a video-only message
  lastAt: string | null;
  unread: number;
}
