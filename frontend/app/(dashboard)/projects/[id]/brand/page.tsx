"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getClientDetail, type ClientDetail } from "@/lib/api";
import { ArrowLeft, Palette, Type, MessageCircle, Briefcase } from "lucide-react";

export default function BrandProfilePage() {
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
    return <div className="text-muted-foreground">Loading brand profile...</div>;
  }

  if (!detail) {
    return <div className="text-destructive">Client not found</div>;
  }

  const { client, brand_identity, company_info } = detail;
  const colors = brand_identity?.colors || [];
  const fonts = brand_identity?.fonts || [];
  const tone = brand_identity?.tone;
  const services = company_info?.services || [];

  return (
    <div>
      <Link
        href={`/projects/${clientId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {client.name}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-1">Brand Profile</h1>
      <p className="text-muted-foreground mb-8">
        Extracted brand elements for {client.name}
      </p>

      <div className="space-y-8">
        {/* Colors */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">Brand Colors</h2>
          </div>
          {colors.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {colors.map((color: any, i: number) => (
                <div key={i} className="text-center">
                  <div
                    className="w-full h-20 rounded-lg border border-border mb-2"
                    style={{ backgroundColor: color.hex }}
                  />
                  <p className="text-sm font-medium">{color.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {color.hex}
                  </p>
                  {color.usage && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {color.usage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No colors extracted yet. Upload brand guidelines to populate.
            </p>
          )}
        </section>

        {/* Fonts */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Type className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">Typography</h2>
          </div>
          {fonts.length > 0 ? (
            <div className="space-y-3">
              {fonts.map((font: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{font.name}</p>
                    {font.weight && (
                      <p className="text-xs text-muted-foreground">
                        {font.weight}
                      </p>
                    )}
                  </div>
                  {font.usage && (
                    <span className="text-xs text-muted-foreground">
                      {font.usage}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No fonts extracted yet. Upload brand guidelines to populate.
            </p>
          )}
        </section>

        {/* Tone */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">Brand Voice &amp; Tone</h2>
          </div>
          {tone && (tone.voice || tone.personality) ? (
            <div className="space-y-4">
              {tone.voice && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Voice
                  </p>
                  <p className="text-sm">{tone.voice}</p>
                </div>
              )}
              {tone.personality && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Personality
                  </p>
                  <p className="text-sm">{tone.personality}</p>
                </div>
              )}
              {tone.dos && tone.dos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">
                    Do
                  </p>
                  <ul className="text-sm space-y-1">
                    {tone.dos.map((d: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-600">+</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tone.donts && tone.donts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">
                    Don&apos;t
                  </p>
                  <ul className="text-sm space-y-1">
                    {tone.donts.map((d: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-600">-</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tone guidelines extracted yet. Upload brand guidelines to
              populate.
            </p>
          )}
        </section>

        {/* Services */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">Services &amp; Offerings</h2>
          </div>
          {services.length > 0 ? (
            <div className="space-y-4">
              {services.map((service: any, i: number) => (
                <div key={i} className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium text-sm">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.description}
                    </p>
                  )}
                  {service.key_features && service.key_features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {service.key_features.map((f: string, j: number) => (
                        <span
                          key={j}
                          className="text-xs bg-background px-2 py-0.5 rounded-full border border-border"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No services extracted yet. Add a website URL or upload company
              docs.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
