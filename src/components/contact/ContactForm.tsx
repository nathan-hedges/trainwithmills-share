"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-12 w-full rounded-xl border border-line bg-paper px-4 text-sm text-ink placeholder:text-muted/60 transition-all focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10";
const labelClass = "mb-1.5 block text-sm font-medium text-ink";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      if (response.ok) {
        
        setMessage("Thank you - I will personally reply within three business days to book your free consult. Keep an eye on your inbox.");
        setTitle("Request received");
      } else {
        setMessage("Sorry, something went wrong. Please try again later.");
        setTitle("Request failed");
      }
    } catch {
      setMessage("Sorry, something went wrong. Please try again later.");
      setTitle("Request failed");
    }
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-white p-10 text-center shadow-soft">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-royal-600 text-white shadow-glow">
          <Check className="h-7 w-7" />
        </span>
        <h3 className="mt-6 font-display text-2xl">{title}</h3>
        <p className="mt-3 max-w-sm text-muted">
          {message}
        </p>
        <Button
          variant="secondary"
          className="mt-7"
          type="button"
          onClick={() => {
            setSubmitted(false);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input id="name" name="name" required placeholder="Jane Doe" className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="jane@email.com"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="goal" className={labelClass}>
            Primary goal
          </label>
          <select id="goal" name="goal" className={inputClass} defaultValue="">
            <option value="" disabled>
              Select one…
            </option>
            <option>Build strength &amp; tone</option>
            <option>Lose fat sustainably</option>
            <option>Nutrition &amp; habits</option>
            <option>Pre / post-natal</option>
            <option>Not sure yet</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className={labelClass}>
            Tell me a little about you
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            placeholder="Where are you starting from, and what would success look like?"
            className={inputClass + " h-auto resize-none py-3"}
          />
        </div>
      </div>

      <Button type="submit" size="lg" disabled={loading} className="mt-6 w-full">
        {loading ? "Sending…" : "Request my free consult"}
      </Button>
      <p className="mt-4 text-center text-xs text-muted">
        No spam, ever. Your details stay between us.
      </p>
    </form>
  );
}
