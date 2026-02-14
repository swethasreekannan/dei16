"""Team management and invitation routes."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from backend.api.auth import AuthContext, get_current_user
from backend.models.database import get_supabase
from backend.models.schemas import (
    InvitationCreate,
    InvitationResponse,
    MemberRoleUpdate,
    OrgMemberResponse,
    TeamPageResponse,
)

router = APIRouter()


def _require_org(auth: AuthContext) -> UUID:
    """Raise 400 if user has no org."""
    if not auth.org_id:
        raise HTTPException(status_code=400, detail="No organization found.")
    return auth.org_id


def _require_admin_or_owner(sb, user_id: UUID, org_id: UUID) -> str:
    """Check that user is owner or admin. Returns the role."""
    result = (
        sb.table("org_members")
        .select("role")
        .eq("org_id", str(org_id))
        .eq("user_id", str(user_id))
        .single()
        .execute()
    )
    if not result.data or result.data["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can manage team.")
    return result.data["role"]


# --- List Team ---


@router.get("/", response_model=TeamPageResponse)
async def get_team(auth: AuthContext = Depends(get_current_user)):
    """List all org members and pending invitations."""
    org_id = _require_org(auth)
    sb = get_supabase()

    # Fetch members with user info via join
    members_result = (
        sb.table("org_members")
        .select("*, users(email, full_name, avatar_url)")
        .eq("org_id", str(org_id))
        .order("created_at")
        .execute()
    )

    members = []
    for row in members_result.data:
        user_data = row.pop("users", {}) or {}
        members.append(OrgMemberResponse(
            **row,
            email=user_data.get("email"),
            full_name=user_data.get("full_name"),
            avatar_url=user_data.get("avatar_url"),
        ))

    # Fetch pending invitations
    invitations_result = (
        sb.table("org_invitations")
        .select("*")
        .eq("org_id", str(org_id))
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    invitations = [InvitationResponse(**row) for row in invitations_result.data]

    return TeamPageResponse(members=members, invitations=invitations)


# --- Invitations ---


@router.post("/invitations", response_model=InvitationResponse)
async def create_invitation(
    invite: InvitationCreate,
    auth: AuthContext = Depends(get_current_user),
):
    """Invite a user to the organization by email."""
    org_id = _require_org(auth)
    sb = get_supabase()
    _require_admin_or_owner(sb, auth.user_id, org_id)

    if invite.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

    # Check if user is already a member
    existing_user = sb.table("users").select("id").eq("email", invite.email).execute()
    if existing_user.data:
        existing_member = (
            sb.table("org_members")
            .select("id")
            .eq("org_id", str(org_id))
            .eq("user_id", existing_user.data[0]["id"])
            .execute()
        )
        if existing_member.data:
            raise HTTPException(status_code=409, detail="User is already a member")

    # Check for existing pending invitation
    existing_invite = (
        sb.table("org_invitations")
        .select("id")
        .eq("org_id", str(org_id))
        .eq("email", invite.email)
        .eq("status", "pending")
        .execute()
    )
    if existing_invite.data:
        raise HTTPException(status_code=409, detail="Invitation already pending for this email")

    # Create invitation
    result = (
        sb.table("org_invitations")
        .insert({
            "org_id": str(org_id),
            "email": invite.email,
            "role": invite.role,
            "invited_by": str(auth.user_id),
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create invitation")

    # If user already exists but is not a member, auto-accept immediately
    if existing_user.data:
        user_id = existing_user.data[0]["id"]
        sb.table("org_members").insert({
            "org_id": str(org_id),
            "user_id": user_id,
            "role": invite.role,
        }).execute()
        sb.table("org_invitations").update({
            "status": "accepted",
            "accepted_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", result.data[0]["id"]).execute()
        # Re-fetch updated record
        updated = (
            sb.table("org_invitations")
            .select("*")
            .eq("id", result.data[0]["id"])
            .single()
            .execute()
        )
        return InvitationResponse(**updated.data)

    return InvitationResponse(**result.data[0])


@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(
    invitation_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    """Cancel a pending invitation."""
    org_id = _require_org(auth)
    sb = get_supabase()
    _require_admin_or_owner(sb, auth.user_id, org_id)

    result = (
        sb.table("org_invitations")
        .update({"status": "cancelled"})
        .eq("id", str(invitation_id))
        .eq("org_id", str(org_id))
        .eq("status", "pending")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")

    return {"cancelled": True}


# --- Member Management ---


@router.patch("/members/{member_user_id}/role")
async def update_member_role(
    member_user_id: UUID,
    update: MemberRoleUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    """Change a member's role. Only owners can do this."""
    org_id = _require_org(auth)
    sb = get_supabase()
    caller_role = _require_admin_or_owner(sb, auth.user_id, org_id)

    if caller_role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can change roles")

    if update.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

    if member_user_id == auth.user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    # Check target exists and is not an owner
    target = (
        sb.table("org_members")
        .select("role")
        .eq("org_id", str(org_id))
        .eq("user_id", str(member_user_id))
        .single()
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.data["role"] == "owner":
        raise HTTPException(status_code=400, detail="Cannot change owner's role")

    sb.table("org_members").update({"role": update.role}).eq(
        "org_id", str(org_id)
    ).eq("user_id", str(member_user_id)).execute()

    return {"updated": True}


@router.delete("/members/{member_user_id}")
async def remove_member(
    member_user_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    """Remove a member from the organization."""
    org_id = _require_org(auth)
    sb = get_supabase()
    _require_admin_or_owner(sb, auth.user_id, org_id)

    if member_user_id == auth.user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    # Check target exists and is not an owner
    target = (
        sb.table("org_members")
        .select("role")
        .eq("org_id", str(org_id))
        .eq("user_id", str(member_user_id))
        .single()
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.data["role"] == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove an owner")

    sb.table("org_members").delete().eq(
        "org_id", str(org_id)
    ).eq("user_id", str(member_user_id)).execute()

    return {"removed": True}
