/**
 * API client for the FastAPI backend.
 * Adds the Supabase auth token to all requests.
 */

import { createClient } from "@/lib/supabase/client";

const API_BASE = "/api";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// --- Organizations ---

export async function setupOrg(data: { name: string; slug: string }) {
  return apiFetch("/projects/setup-org", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Clients ---

export interface Client {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  website_url: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
}

export interface ClientDetail {
  client: Client;
  brand_identity: any | null;
  company_info: any | null;
  assets: any[];
  recent_briefs: any[];
}

export async function listClients(): Promise<Client[]> {
  return apiFetch("/projects/");
}

export async function createNewClient(data: {
  name: string;
  website_url?: string;
}): Promise<Client> {
  return apiFetch("/projects/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getClientDetail(clientId: string): Promise<ClientDetail> {
  return apiFetch(`/projects/${clientId}`);
}

export async function deleteClient(clientId: string): Promise<void> {
  return apiFetch(`/projects/${clientId}`, { method: "DELETE" });
}

// --- Brand Assets ---

export async function uploadBrandAsset(clientId: string, file: File) {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/projects/${clientId}/assets`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Upload failed: ${res.status}`);
  }

  return res.json();
}

// --- Briefs ---

export interface Brief {
  id: string;
  client_id: string;
  message: string;
  status: string;
  creative_strategy: any | null;
  created_at: string;
  completed_at: string | null;
}

export async function createBrief(data: {
  client_id: string;
  message: string;
}): Promise<Brief> {
  return apiFetch("/briefs/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getBrief(briefId: string): Promise<Brief> {
  return apiFetch(`/briefs/${briefId}`);
}

export async function listClientBriefs(clientId: string): Promise<Brief[]> {
  return apiFetch(`/briefs/client/${clientId}`);
}

// --- Team ---

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role: string;
  invited_by: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

export interface TeamData {
  members: OrgMember[];
  invitations: Invitation[];
}

export async function getTeam(): Promise<TeamData> {
  return apiFetch("/team/");
}

export async function createInvitation(data: {
  email: string;
  role: string;
}): Promise<Invitation> {
  return apiFetch("/team/invitations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  return apiFetch(`/team/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

export async function updateMemberRole(
  userId: string,
  role: string
): Promise<void> {
  return apiFetch(`/team/members/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(userId: string): Promise<void> {
  return apiFetch(`/team/members/${userId}`, {
    method: "DELETE",
  });
}
