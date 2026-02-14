"use client";

import { useEffect, useState } from "react";
import {
  getTeam,
  createInvitation,
  cancelInvitation,
  updateMemberRole,
  removeMember,
  type TeamData,
  type OrgMember,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  Trash2,
  X,
} from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  member: "bg-gray-100 text-gray-600",
};

const ROLE_ICON: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: Users,
};

export default function TeamPage() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      const data = await getTeam();
      setTeam(data);

      // Find current user's role
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const me = data.members.find(
          (m) => m.user_id === userData.user!.id
        );
        if (me) setCurrentUserRole(me.role);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner = currentUserRole === "owner";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setFeedback(null);

    try {
      await createInvitation({ email: inviteEmail, role: inviteRole });
      setFeedback({ type: "success", message: `Invitation sent to ${inviteEmail}` });
      setInviteEmail("");
      setInviteRole("member");
      setShowInviteForm(false);
      await loadTeam();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to send invitation" });
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvite(invitationId: string) {
    try {
      await cancelInvitation(invitationId);
      await loadTeam();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to cancel invitation" });
    }
  }

  async function handleRoleChange(member: OrgMember, newRole: string) {
    try {
      await updateMemberRole(member.user_id, newRole);
      await loadTeam();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update role" });
    }
  }

  async function handleRemove(member: OrgMember) {
    const name = member.full_name || member.email || "this member";
    if (!confirm(`Remove ${name} from the organization?`)) return;

    try {
      await removeMember(member.user_id);
      await loadTeam();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to remove member" });
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading team...</div>;
  }

  if (!team) {
    return <div className="text-destructive">Failed to load team data</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization members and invitations
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setShowInviteForm(!showInviteForm);
              setFeedback(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" />
            Invite Teammate
          </button>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h3 className="font-semibold text-sm mb-4">Invite a teammate</h3>
          <form onSubmit={handleInvite} className="flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="inviteEmail"
                className="block text-xs font-medium text-muted-foreground mb-1.5"
              >
                Email address
              </label>
              <input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="teammate@agency.com"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label
                htmlFor="inviteRole"
                className="block text-xs font-medium text-muted-foreground mb-1.5"
              >
                Role
              </label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {inviting ? "Sending..." : "Send Invite"}
            </button>
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              className="px-3 py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Members */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="font-semibold">
            Members ({team.members.length})
          </h2>
        </div>

        <div className="space-y-2">
          {team.members.map((member) => {
            const RoleIcon = ROLE_ICON[member.role] || Users;
            const isSelf = member.user_id === currentUserId;
            const canChangeRole = isOwner && !isSelf && member.role !== "owner";
            const canRemove = canManage && !isSelf && member.role !== "owner";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {(member.full_name || member.email || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.full_name || "Unnamed"}
                      {isSelf && (
                        <span className="text-xs text-muted-foreground ml-1.5">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canChangeRole ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value)}
                      className="text-xs px-2 py-1 rounded-full border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                        ROLE_BADGE[member.role] || ROLE_BADGE.member
                      }`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {member.role}
                    </span>
                  )}

                  {canRemove ? (
                    <button
                      onClick={() => handleRemove(member)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="w-7" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      {team.invitations.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">
              Pending Invitations ({team.invitations.length})
            </h2>
          </div>

          <div className="space-y-2">
            {team.invitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited{" "}
                      {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      ROLE_BADGE[invite.role] || ROLE_BADGE.member
                    }`}
                  >
                    {invite.role}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                      title="Cancel invitation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
