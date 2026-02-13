"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNewClient } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewClientPage() {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const client = await createNewClient({
        name,
        website_url: websiteUrl || undefined,
      });
      router.push(`/projects/${client.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create client");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-1">New Client</h1>
      <p className="text-muted-foreground mb-8">
        Set up a new client project. You can add brand assets and team members
        after creation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Client Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="e.g., Toss The Coin"
          />
        </div>

        <div>
          <label
            htmlFor="websiteUrl"
            className="block text-sm font-medium mb-1.5"
          >
            Website URL{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="https://tossthecoin.com"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            We&apos;ll scrape this to auto-extract company info, services, and
            offerings.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Client"}
          </button>
          <Link
            href="/projects"
            className="px-6 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
