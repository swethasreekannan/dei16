"""Pydantic schemas for API request/response validation."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, HttpUrl


# --- Organizations ---


class OrgCreate(BaseModel):
    name: str
    slug: str


class OrgResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime


# --- Team / Invitations ---


class InvitationCreate(BaseModel):
    email: str
    role: str = "member"


class InvitationResponse(BaseModel):
    id: UUID
    org_id: UUID
    email: str
    role: str
    invited_by: UUID | None
    status: str
    created_at: datetime
    accepted_at: datetime | None = None


class OrgMemberResponse(BaseModel):
    id: UUID
    org_id: UUID
    user_id: UUID
    role: str
    created_at: datetime
    email: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None


class MemberRoleUpdate(BaseModel):
    role: str


class TeamPageResponse(BaseModel):
    members: list[OrgMemberResponse]
    invitations: list[InvitationResponse]


# --- Clients ---


class ClientCreate(BaseModel):
    name: str
    website_url: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    website_url: str | None = None
    status: str | None = None


class ClientResponse(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    slug: str
    website_url: str | None
    status: str
    created_at: datetime
    created_by: UUID | None


# --- Brand Identity ---


class ColorItem(BaseModel):
    name: str
    hex: str
    rgb: str | None = None
    usage: str | None = None


class FontItem(BaseModel):
    name: str
    weight: str | None = None
    usage: str | None = None


class LogoItem(BaseModel):
    url: str
    variant: str | None = None
    min_size: str | None = None


class ToneInfo(BaseModel):
    voice: str | None = None
    personality: str | None = None
    dos: list[str] = []
    donts: list[str] = []


class BrandIdentityResponse(BaseModel):
    id: UUID
    client_id: UUID
    colors: list[ColorItem] = []
    fonts: list[FontItem] = []
    logos: list[LogoItem] = []
    tone: ToneInfo | None = None
    visual_style: dict = {}
    content_rules: dict = {}
    updated_at: datetime


# --- Company Info ---


class ServiceItem(BaseModel):
    name: str
    description: str | None = None
    key_features: list[str] = []
    target_audience: str | None = None


class CompanyInfoResponse(BaseModel):
    id: UUID
    client_id: UUID
    name: str | None
    tagline: str | None
    mission: str | None
    vision: str | None
    about: str | None
    services: list[ServiceItem] = []
    offerings: list[dict] = []
    team: list[dict] = []
    case_studies: list[dict] = []
    differentiators: list[str] = []
    updated_at: datetime


# --- Brand Assets ---


class BrandAssetResponse(BaseModel):
    id: UUID
    client_id: UUID
    type: str
    original_filename: str
    storage_path: str
    file_size: int | None
    mime_type: str | None
    processing_status: str
    uploaded_by: UUID | None
    created_at: datetime


# --- Briefs ---


class BriefCreate(BaseModel):
    client_id: UUID
    message: str


class BriefResponse(BaseModel):
    id: UUID
    client_id: UUID
    created_by: UUID | None
    message: str
    status: str
    creative_strategy: dict | None
    created_at: datetime
    completed_at: datetime | None


# --- Deliverables ---


class DeliverableResponse(BaseModel):
    id: UUID
    brief_id: UUID
    client_id: UUID
    type: str
    title: str
    description: str | None
    storage_path: str
    file_size: int | None
    mime_type: str | None
    thumbnail_path: str | None
    review_status: str
    revision_count: int
    version: int
    created_at: datetime


# --- Client Detail (combined view) ---


class ClientDetailResponse(BaseModel):
    client: ClientResponse
    brand_identity: BrandIdentityResponse | None = None
    company_info: CompanyInfoResponse | None = None
    assets: list[BrandAssetResponse] = []
    recent_briefs: list[BriefResponse] = []
