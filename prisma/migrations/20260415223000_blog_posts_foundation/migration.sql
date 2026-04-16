CREATE TABLE "blog_posts" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "cover_image" TEXT,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_is_published_published_at_idx" ON "blog_posts"("is_published", "published_at");
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts"("published_at");
