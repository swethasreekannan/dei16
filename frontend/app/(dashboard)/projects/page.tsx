"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listClients, type Client } from "@/lib/api";
import { Plus, Globe, FolderOpen } from "lucide-react";

export default function ProjectsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client projects and brand assets
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Client
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading clients...
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No clients yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first client project to get started
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create Client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/projects/${client.id}`}
              className="bg-card rounded-xl border border-border p-6 hover:border-accent/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg">{client.name}</h3>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    client.status === "active"
                      ? "bg-green-100 text-green-700"
                      : client.status === "onboarding"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                  )}
                >
                  {client.status}
                </span>
              </div>

              {client.website_url && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="truncate">{client.website_url}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                Created {new Date(client.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
