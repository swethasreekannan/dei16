from supabase import create_client, Client

from backend.config.settings import settings

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Get the Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase_client


def get_supabase_anon() -> Client:
    """Get a Supabase client using the anon key (respects RLS)."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)
