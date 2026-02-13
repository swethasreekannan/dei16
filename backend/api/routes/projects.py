"""Client/project CRUD routes."""

import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from backend.api.auth import AuthContext, get_current_user
from backend.models.database import get_supabase
from backend.models.schemas import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientDetailResponse,
    BrandAssetResponse,
    BrandIdentityResponse,
    CompanyInfoResponse,
    BriefResponse,
    OrgCreate,
    OrgResponse,
)

router = APIRouter()


def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text


# --- Organization Setup ---


@router.post("/setup-org", response_model=OrgResponse)
async def setup_organization(org: OrgCreate, auth: AuthContext = Depends(get_current_user)):
    """Create an organization and add the current user as owner.

    Called once during onboarding.
    """
    sb = get_supabase()

    # Create org
    org_result = (
        sb.table("organizations")
        .insert({"name": org.name, "slug": org.slug})
        .execute()
    )
    if not org_result.data:
        raise HTTPException(status_code=400, detail="Failed to create organization")

    org_data = org_result.data[0]

    # Add user as owner
    sb.table("org_members").insert({
        "org_id": org_data["id"],
        "user_id": str(auth.user_id),
        "role": "owner",
    }).execute()

    return OrgResponse(**org_data)


# --- Client CRUD ---


@router.get("/", response_model=list[ClientResponse])
async def list_clients(auth: AuthContext = Depends(get_current_user)):
    """List all clients in the user's organization."""
    if not auth.org_id:
        return []

    sb = get_supabase()
    result = (
        sb.table("clients")
        .select("*")
        .eq("org_id", str(auth.org_id))
        .order("created_at", desc=True)
        .execute()
    )
    return [ClientResponse(**row) for row in result.data]


@router.post("/", response_model=ClientResponse)
async def create_client(client: ClientCreate, auth: AuthContext = Depends(get_current_user)):
    """Create a new client project."""
    if not auth.org_id:
        raise HTTPException(status_code=400, detail="No organization found. Set up an org first.")

    slug = slugify(client.name)
    sb = get_supabase()

    result = (
        sb.table("clients")
        .insert({
            "org_id": str(auth.org_id),
            "name": client.name,
            "slug": slug,
            "website_url": client.website_url,
            "created_by": str(auth.user_id),
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create client")

    return ClientResponse(**result.data[0])


@router.get("/{client_id}", response_model=ClientDetailResponse)
async def get_client_detail(client_id: UUID, auth: AuthContext = Depends(get_current_user)):
    """Get full client detail including brand identity, company info, assets, and recent briefs."""
    sb = get_supabase()

    # Fetch client
    client_result = (
        sb.table("clients").select("*").eq("id", str(client_id)).single().execute()
    )
    if not client_result.data:
        raise HTTPException(status_code=404, detail="Client not found")

    client_data = client_result.data

    # Verify org access
    if auth.org_id and str(auth.org_id) != client_data.get("org_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    # Fetch brand identity
    brand_result = (
        sb.table("brand_identity").select("*").eq("client_id", str(client_id)).execute()
    )
    brand_identity = BrandIdentityResponse(**brand_result.data[0]) if brand_result.data else None

    # Fetch company info
    company_result = (
        sb.table("company_info").select("*").eq("client_id", str(client_id)).execute()
    )
    company_info = CompanyInfoResponse(**company_result.data[0]) if company_result.data else None

    # Fetch assets
    assets_result = (
        sb.table("brand_assets")
        .select("*")
        .eq("client_id", str(client_id))
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    assets = [BrandAssetResponse(**row) for row in assets_result.data]

    # Fetch recent briefs
    briefs_result = (
        sb.table("briefs")
        .select("*")
        .eq("client_id", str(client_id))
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    recent_briefs = [BriefResponse(**row) for row in briefs_result.data]

    return ClientDetailResponse(
        client=ClientResponse(**client_data),
        brand_identity=brand_identity,
        company_info=company_info,
        assets=assets,
        recent_briefs=recent_briefs,
    )


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID, update: ClientUpdate, auth: AuthContext = Depends(get_current_user)
):
    """Update a client's details."""
    sb = get_supabase()
    update_data = update.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        sb.table("clients")
        .update(update_data)
        .eq("id", str(client_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Client not found")

    return ClientResponse(**result.data[0])


@router.delete("/{client_id}")
async def delete_client(client_id: UUID, auth: AuthContext = Depends(get_current_user)):
    """Delete a client and all associated data."""
    sb = get_supabase()
    sb.table("clients").delete().eq("id", str(client_id)).execute()
    return {"deleted": True}


# --- File Upload ---

MIME_TO_TYPE = {
    "application/pdf": "pdf",
    "image/png": "image",
    "image/jpeg": "image",
    "image/svg+xml": "image",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "deck",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
    "text/csv": "spreadsheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
}


@router.post("/{client_id}/assets", response_model=BrandAssetResponse)
async def upload_brand_asset(
    client_id: UUID,
    file: UploadFile = File(...),
    auth: AuthContext = Depends(get_current_user),
):
    """Upload a brand asset (PDF, image, font, deck, spreadsheet, etc.)."""
    sb = get_supabase()

    # Determine file type from MIME
    mime = file.content_type or "application/octet-stream"
    asset_type = MIME_TO_TYPE.get(mime, "other")

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Upload to Supabase Storage
    storage_path = f"brand-assets/{client_id}/{file.filename}"
    sb.storage.from_("brand-assets").upload(
        path=f"{client_id}/{file.filename}",
        file=content,
        file_options={"content-type": mime},
    )

    # Create asset record
    result = (
        sb.table("brand_assets")
        .insert({
            "client_id": str(client_id),
            "type": asset_type,
            "original_filename": file.filename,
            "storage_path": storage_path,
            "file_size": file_size,
            "mime_type": mime,
            "uploaded_by": str(auth.user_id),
        })
        .execute()
    )

    return BrandAssetResponse(**result.data[0])


@router.get("/{client_id}/assets", response_model=list[BrandAssetResponse])
async def list_brand_assets(client_id: UUID, auth: AuthContext = Depends(get_current_user)):
    """List all brand assets for a client."""
    sb = get_supabase()
    result = (
        sb.table("brand_assets")
        .select("*")
        .eq("client_id", str(client_id))
        .order("created_at", desc=True)
        .execute()
    )
    return [BrandAssetResponse(**row) for row in result.data]
