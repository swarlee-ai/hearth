"""Add store_layout to app_settings

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-09 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: str = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "app_settings",
        sa.Column("store_layout", sa.String(50), nullable=False, server_default="default"),
    )


def downgrade() -> None:
    op.drop_column("app_settings", "store_layout")
