"""Add meal_schedule to app_settings

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-09 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DEFAULT = (
    '{"monday":["dinner"],"tuesday":["dinner"],"wednesday":["dinner"],'
    '"thursday":["dinner"],"friday":["dinner"],"saturday":["dinner"],"sunday":["dinner"]}'
)


def upgrade() -> None:
    op.add_column(
        "app_settings",
        sa.Column(
            "meal_schedule",
            JSONB(),
            nullable=False,
            server_default=sa.text(f"'{_DEFAULT}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("app_settings", "meal_schedule")
