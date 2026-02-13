"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getClientDetail, type ClientDetail } from "@/lib/api";
import { FileUploader } from "@/components/brand-upload/file-uploader";
import {
  ArrowLeft,
  Globe,
  Palette,
  MessageSquare,
  FileText,
  Upload,
} from "lucide-react";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientDetail(clientId)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return <div className="text-muted-foreground">Loading client...</div>;
  }

  if (!detail) {
    return <div className="text-destructive">Client not found</div>;
  }

  const { client, brand_identity, company_info, assets } = detail;
  const hasColors = brand_identity?.colors && brand_identity.colors.length > 0;
  const hasServices =
    company_info?.services && company_info.services.length > 0;

  return (
    <div>
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          {client.website_url && (
            <a
              href={client.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline mt-1"
            >
              <Globe className="h-3.5 w-3.5" />
              {client.website_url}
            </a>
          )}
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            client.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {client.status}
        </span>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href={`/projects/${clientId}/brand`}
          className="bg-card rounded-xl border border-border p-5 hover:border-accent/50 transition-colors"
        >
          <Palette className="h-5 w-5 text-accent mb-3" />
          <h3 className="font-semibold text-sm">Brand Profile</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {hasColors
              ? `${brand_identity.colors.length} colors, ${brand_identity.fonts?.length || 0} fonts`
              : "No brand data yet — upload guidelines"}
          </p>
        </Link>

        <Link
          href={`/projects/${clientId}/brief`}
          className="bg-card rounded-xl border border-border p-5 hover:border-accent/50 transition-colors"
        >
          <MessageSquare className="h-5 w-5 text-accent mb-3" />
          <h3 className="font-semibold text-sm">Create Brief</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Request deliverables in natural language
          </p>
        </Link>

        <div className="bg-card rounded-xl border border-border p-5">
          <FileText className="h-5 w-5 text-accent mb-3" />
          <h3 className="font-semibold text-sm">
            {hasServices
              ? `${company_info.services.length} Services`
              : "No company info yet"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {hasServices
              ? company_info.services
                  .map((s: any) => s.name)
                  .join(", ")
              : "Add website URL or upload docs"}
          </p>
        </div>
      </div>

      {/* Brand Assets Upload */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5 text-accent" />
          <h2 className="font-semibold">Brand Assets</h2>
        </div>

        <FileUploader clientId={clientId} />

        {assets.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Uploaded Files</h3>
            <div className="space-y-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{asset.original_filename}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {asset.type}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        asset.processing_status === "completed"
                          ? "bg-green-100 text-green-700"
                          : asset.processing_status === "processing"
                            ? "bg-blue-100 text-blue-700"
                            : asset.processing_status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {asset.processing_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
