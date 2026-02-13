"""Brief submission and status routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from backend.api.auth import AuthContext, get_current_user
from backend.models.database import get_supabase
from backend.models.schemas import BriefCreate, BriefResponse, DeliverableResponse

router = APIRouter()


@router.post("/", response_model=BriefResponse)
async def create_brief(brief: BriefCreate, auth: AuthContext = Depends(get_current_user)):
    """Submit a new brief for processing.

    The brief is a natural language request like:
    'Give me a one-pager for the branding studio service'
    """
    sb = get_supabase()

    result = (
        sb.table("briefs")
        .insert({
            "client_id": str(brief.client_id),
            "created_by": str(auth.user_id),
            "message": brief.message,
            "status": "pending",
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create brief")

    # TODO: Phase 1C — Enqueue Celery task to process brief with agents
    # from backend.tasks import process_brief
    # process_brief.delay(str(result.data[0]["id"]))

    return BriefResponse(**result.data[0])


@router.get("/{brief_id}", response_model=BriefResponse)
async def get_brief(brief_id: UUID, auth: AuthContext = Depends(get_current_user)):
    """Get a brief's details and status."""
    sb = get_supabase()
    result = sb.table("briefs").select("*").eq("id", str(brief_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Brief not found")
    return BriefResponse(**result.data)


@router.get("/{brief_id}/deliverables", response_model=list[DeliverableResponse])
async def get_brief_deliverables(brief_id: UUID, auth: AuthContext = Depends(get_current_user)):
    """Get all deliverables produced for a brief."""
    sb = get_supabase()
    result = (
        sb.table("deliverables")
        .select("*")
        .eq("brief_id", str(brief_id))
        .order("created_at", desc=True)
        .execute()
    )
    return [DeliverableResponse(**row) for row in result.data]


@router.get("/client/{client_id}", response_model=list[BriefResponse])
async def list_client_briefs(client_id: UUID, auth: AuthContext = Depends(get_current_user)):
    """List all briefs for a client."""
    sb = get_supabase()
    result = (
        sb.table("briefs")
        .select("*")
        .eq("client_id", str(client_id))
        .order("created_at", desc=True)
        .execute()
    )
    return [BriefResponse(**row) for row in result.data]
