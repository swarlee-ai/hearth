"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("onboarding_complete", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("adults_count", sa.Integer(), nullable=False, server_default=sa.text("2")),
        sa.Column("kids", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("dietary_restrictions", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("cuisine_preferences", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("disliked_cuisines", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("spice_tolerance", sa.String(20), nullable=False, server_default=sa.text("'medium'")),
        sa.Column("planned_meals", JSONB(), nullable=False, server_default=sa.text("""'["dinner"]'::jsonb""")),
        sa.Column("llm_base_url", sa.String(500), nullable=True),
        sa.Column("llm_api_key", sa.String(500), nullable=True),
        sa.Column("llm_model_name", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.execute(sa.text(
        "INSERT INTO app_settings (id, onboarding_complete, adults_count, kids, dietary_restrictions, "
        "cuisine_preferences, disliked_cuisines, spice_tolerance, planned_meals) "
        "VALUES (1, false, 2, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'medium', '[\"dinner\"]'::jsonb) "
        "ON CONFLICT DO NOTHING"
    ))

    op.create_table(
        "recipes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_url", sa.String(1000), nullable=True),
        sa.Column("image_url", sa.String(1000), nullable=True),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=True),
        sa.Column("cook_time_minutes", sa.Integer(), nullable=True),
        sa.Column("total_time_minutes", sa.Integer(), nullable=True),
        sa.Column("servings", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("difficulty", sa.String(20), nullable=True),
        sa.Column("ingredients", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("instructions", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("cuisine_type", sa.String(100), nullable=True),
        sa.Column("tags", ARRAY(sa.String()), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_kid_friendly", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("kid_mod_notes", sa.Text(), nullable=True),
        sa.Column("is_leftover_friendly", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("leftover_days", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("nutrition_per_serving", JSONB(), nullable=True),
        sa.Column("nutrition_is_estimated", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_recipes_tags", "recipes", ["tags"], postgresql_using="gin")
    op.create_index("idx_recipes_cuisine", "recipes", ["cuisine_type"])
    op.create_index("idx_recipes_favorite", "recipes", ["is_favorite"])

    op.create_table(
        "meal_plans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("week_start_date", sa.Date(), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=True),
        sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("generation_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "meal_plan_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("meal_plan_id", UUID(as_uuid=True), sa.ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipe_id", UUID(as_uuid=True), sa.ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("plan_date", sa.Date(), nullable=False),
        sa.Column("meal_type", sa.String(20), nullable=False),
        sa.Column("servings_override", sa.Integer(), nullable=True),
        sa.Column("is_leftover_of", UUID(as_uuid=True), sa.ForeignKey("meal_plan_entries.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("meal_plan_id", "plan_date", "meal_type", "sort_order"),
    )

    op.create_table(
        "shopping_lists",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("meal_plan_id", UUID(as_uuid=True), sa.ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("items", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )

    op.create_table(
        "trusted_sites",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False, unique=True),
        sa.Column("scrape_pattern", sa.String(500), nullable=True),
        sa.Column("last_browsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "recipe_scrape_cache",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("url", sa.String(1000), nullable=False, unique=True),
        sa.Column("scraped_data", JSONB(), nullable=False),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("recipe_scrape_cache")
    op.drop_table("trusted_sites")
    op.drop_table("shopping_lists")
    op.drop_table("meal_plan_entries")
    op.drop_table("meal_plans")
    op.drop_table("recipes")
    op.drop_table("app_settings")
