"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrief, listClientBriefs, type Brief } from "@/lib/api";
import { ArrowLeft, Send, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function BriefPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [message, setMessage] = useState("");
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listClientBriefs(clientId).then(setBriefs).catch(console.error);
  }, [clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setError("");
    setSubmitting(true);

    try {
      const brief = await createBrief({ client_id: clientId, message });
      setBriefs((prev) => [brief, ...prev]);
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Failed to submit brief");
    } finally {
      setSubmitting(false);
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="max-w-2xl">
      <Link
        href={`/projects/${clientId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Client
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-1">Create Brief</h1>
      <p className="text-muted-foreground mb-8">
        Describe what you need in natural language. The AI agents will handle the
        rest.
      </p>

      {/* Brief Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-card rounded-xl border border-border p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., Give me a one-pager for the branding studio service..."
            rows={4}
            className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex-1" />
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Submitting..." : "Submit Brief"}
            </button>
          </div>
        </div>
      </form>

      {/* Brief History */}
      {briefs.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4">Brief History</h2>
          <div className="space-y-3">
            {briefs.map((brief) => (
              <div
                key={brief.id}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm flex-1">{brief.message}</p>
                  <div className="flex items-center gap-1.5 ml-4">
                    {statusIcon(brief.status)}
                    <span className="text-xs text-muted-foreground capitalize">
                      {brief.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(brief.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
