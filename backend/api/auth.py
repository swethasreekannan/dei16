"""Auth middleware — validates Supabase JWT and extracts user + org context."""

from uuid import UUID

from fastapi import Depends, HTTPException, Request
from supabase import Client

from backend.models.database import get_supabase


class AuthContext:
    """Holds the authenticated user's context."""

    def __init__(self, user_id: UUID, email: str, org_id: UUID | None = None):
        self.user_id = user_id
        self.email = email
        self.org_id = org_id


async def get_current_user(request: Request) -> AuthContext:
    """Extract and validate the user from the Authorization header.

    Uses Supabase's auth.getUser() to validate the JWT.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header.removeprefix("Bearer ")

    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e}")

    # Get the user's org (use first org for now; multi-org comes later)
    org_result = (
        sb.table("org_members")
        .select("org_id")
        .eq("user_id", str(user.id))
        .limit(1)
        .execute()
    )
    org_id = UUID(org_result.data[0]["org_id"]) if org_result.data else None

    return AuthContext(user_id=UUID(user.id), email=user.email, org_id=org_id)
