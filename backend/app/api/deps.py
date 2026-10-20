"""Shared API dependencies."""
from fastapi import Header

from app.config import get_settings


def current_actor(x_admin_name: str = Header(default="", alias="X-Admin-Name")) -> str:
    """Acting user. Auth is out of scope for the local prototype: a demo administrator is assumed.

    The ``X-Admin-Name`` header is accepted only as a *label* for the audit trail. A real deployment must replace
    this with authenticated identity + role-based access control.
    """
    name = " ".join(x_admin_name.split())[:60]
    return name or get_settings().demo_admin_name
