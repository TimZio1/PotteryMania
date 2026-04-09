/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Import Spreadshirt / SPOD product export CSV into WearProduct + WearProductVariant.
 * Groups rows by "Product ID". Upserts by slug / variant SKUs (same idea as Spreadconnect catalog sync).
 *
 * Usage (from potterymania/):
 *   node scripts/import-spod-wear-csv.cjs [path/to/export.csv]
 *
 * Default CSV: data/imports/product-export-potterymania-2026-04-08-19-22-57.csv
 */

const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const { PrismaClient } = require("@prisma/client");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const prisma = new PrismaClient();

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;
  const src = String(text ?? "").replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(cur);
      if (row.some((v) => String(v).trim().length > 0)) rows.push(row);
      row = [];
      cur = "";
      continue;
    }
    cur += c;
  }

  row.push(cur);
  if (row.some((v) => String(v).trim().length > 0)) rows.push(row);
  return rows;
}

function normalizeWearSlug(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePriceToCents(raw) {
  const s = String(raw ?? "")
    .trim()
    .replace(",", ".");
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function uniqueHttpsUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    const v = String(u ?? "").trim();
    if (!v || seen.has(v) || !/^https?:\/\//i.test(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function colIndex(headerRow, name) {
  const i = headerRow.findIndex((h) => h.trim() === name);
  if (i < 0) throw new Error(`Missing CSV column: ${name}`);
  return i;
}

async function ensureUniqueSlug(base, existingProductId) {
  let slug = base.length >= 2 ? base : `wear-${existingProductId || "new"}`;
  let suffix = 2;
  for (;;) {
    const conflict = await prisma.wearProduct.findFirst({
      where: {
        slug,
        ...(existingProductId ? { NOT: { id: existingProductId } } : {}),
      },
      select: { id: true },
    });
    if (!conflict) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function findExistingProduct(slugBase, skus) {
  const uniqueSkus = [...new Set(skus.filter(Boolean))];
  const orClause = [{ slug: slugBase }];
  if (uniqueSkus.length > 0) {
    orClause.push({ externalFulfillmentId: { in: uniqueSkus } });
    orClause.push({ variants: { some: { sku: { in: uniqueSkus } } } });
  }

  return prisma.wearProduct.findFirst({
    where: {
      OR: orClause,
    },
    include: {
      variants: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });
}

function parseArticleId(raw) {
  const n = parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function catalogFingerprint(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function syncProductGroup(rows, header, productSortOrder) {
  const I = {
    name: colIndex(header, "Product Name"),
    sku: colIndex(header, "SKU"),
    productId: colIndex(header, "Product ID"),
    size: colIndex(header, "Size"),
    color: colIndex(header, "Color"),
    description: colIndex(header, "Product Description"),
    price: colIndex(header, "Price"),
  };
  const imageCols = [];
  for (let n = 1; n <= 5; n++) {
    try {
      imageCols.push(colIndex(header, `Image URL ${n}`));
    } catch {
      break;
    }
  }

  const name = (rows[0][I.name] || "").trim();
  if (!name) throw new Error("Empty Product Name");

  const articleId = parseArticleId(rows[0][I.productId]);
  const slugBase = normalizeWearSlug(name) || `spod-${(rows[0][I.productId] || "").trim()}`;
  const skus = rows.map((r) => (r[I.sku] || "").trim()).filter(Boolean);
  if (skus.length === 0) throw new Error(`No SKUs for product ${name}`);

  const description =
    rows.map((r) => (r[I.description] || "").trim()).find((d) => d.length > 0) || null;

  const imageUrls = uniqueHttpsUrls(
    rows.flatMap((r) => imageCols.map((ci) => (r[ci] || "").trim())),
  );

  const variants = rows.map((r, index) => {
    const size = (r[I.size] || "").trim();
    const color = (r[I.color] || "").trim();
    const sku = (r[I.sku] || "").trim();
    const parts = [size, color].filter(Boolean);
    const label = parts.join(" · ") || "Default";
    const priceCents = parsePriceToCents(r[I.price]);
    return {
      label,
      sku: sku || null,
      optionSize: size || null,
      optionColor: color || null,
      priceCents,
      sortOrder: index,
    };
  });

  const priceCandidates = variants.map((v) => v.priceCents).filter((c) => c != null);
  if (priceCandidates.length === 0) throw new Error(`No valid prices for ${name}`);
  const priceCents = Math.min(...priceCandidates);

  const currency = (process.env.SPREADCONNECT_CATALOG_CURRENCY || "EUR").trim().toUpperCase().slice(0, 8);
  const externalFulfillmentId = variants.length === 1 && variants[0].sku ? variants[0].sku : null;

  const existing = articleId
    ? await prisma.wearProduct.findFirst({
        where: {
          OR: [{ spreadconnectArticleId: articleId }, { slug: slugBase }, { variants: { some: { sku: { in: skus } } } }],
        },
        include: { variants: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } },
      })
    : await findExistingProduct(slugBase, skus);
  const slug = await ensureUniqueSlug(slugBase, existing?.id ?? null);
  const fingerprintPayload = {
    id: articleId,
    name,
    description,
    images: [...imageUrls].sort(),
    priceCents,
    variants: variants
      .map((v) => ({
        sku: v.sku,
        label: v.label,
        optionSize: v.optionSize,
        optionColor: v.optionColor,
        priceCents: v.priceCents,
        sortOrder: v.sortOrder,
      }))
      .sort((a, b) => String(a.sku || "").localeCompare(String(b.sku || ""))),
  };
  const fp = catalogFingerprint(fingerprintPayload);
  if (
    existing &&
    articleId != null &&
    existing.spreadconnectArticleId === articleId &&
    existing.spreadconnectCatalogFingerprint &&
    existing.spreadconnectCatalogFingerprint === fp
  ) {
    return { id: existing.id, created: false, updated: false, unchanged: true, variantCount: variants.length };
  }

  const articleIdData = articleId != null ? { spreadconnectArticleId: articleId } : {};

  const product = existing
    ? await prisma.wearProduct.update({
        where: { id: existing.id },
        data: {
          slug,
          name,
          description,
          images: imageUrls,
          priceCents,
          currency: existing.currency || currency,
          isActive: true,
          archivedAt: null,
          sortOrder: productSortOrder,
          externalFulfillmentId,
          spreadconnectCatalogFingerprint: fp,
          ...articleIdData,
        },
      })
    : await prisma.wearProduct.create({
        data: {
          slug,
          name,
          description,
          priceCents,
          currency,
          images: imageUrls,
          isActive: true,
          archivedAt: null,
          sortOrder: productSortOrder,
          externalFulfillmentId,
          spreadconnectCatalogFingerprint: fp,
          ...articleIdData,
        },
      });

  const existingVariants = existing?.variants ?? [];
  const incomingSkus = new Set(variants.map((v) => v.sku).filter(Boolean));

  for (const variant of variants) {
    const current = existingVariants.find((row) => row.sku && row.sku === variant.sku);
    if (current) {
      await prisma.wearProductVariant.update({
        where: { id: current.id },
        data: {
          label: variant.label,
          sku: variant.sku,
          optionSize: variant.optionSize,
          optionColor: variant.optionColor,
          priceCents: variant.priceCents,
          sortOrder: variant.sortOrder,
          isActive: true,
        },
      });
    } else {
      await prisma.wearProductVariant.create({
        data: {
          wearProductId: product.id,
          label: variant.label,
          sku: variant.sku,
          optionSize: variant.optionSize,
          optionColor: variant.optionColor,
          priceCents: variant.priceCents,
          sortOrder: variant.sortOrder,
          isActive: true,
        },
      });
    }
  }

  const staleVariantIds = existingVariants
    .filter((row) => !row.sku || !incomingSkus.has(row.sku))
    .map((row) => row.id);
  if (staleVariantIds.length > 0) {
    await prisma.wearProductVariant.updateMany({
      where: { id: { in: staleVariantIds } },
      data: { isActive: false },
    });
  }

  return { id: product.id, created: !existing, updated: !!existing, unchanged: false, variantCount: variants.length };
}

async function main() {
  const defaultCsv = path.join(
    __dirname,
    "..",
    "data",
    "imports",
    "product-export-potterymania-2026-04-08-19-22-57.csv",
  );
  const csvPath = path.resolve(process.argv[2] || defaultCsv);
  if (!fs.existsSync(csvPath)) {
    console.error("File not found:", csvPath);
    process.exit(1);
  }

  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error("CSV has no data rows");
    process.exit(1);
  }

  const header = rows[0];
  const groups = new Map();
  const Ipid = colIndex(header, "Product ID");

  for (let li = 1; li < rows.length; li++) {
    const row = rows[li];
    if (row.length < header.length) {
      console.warn(`Skipping line ${li + 1}: expected ${header.length} columns, got ${row.length}`);
      continue;
    }
    const pid = (row[Ipid] || "").trim();
    if (!pid) continue;
    if (!groups.has(pid)) groups.set(pid, []);
    groups.get(pid).push(row);
  }

  console.log(`Importing ${groups.size} products from ${csvPath} …`);

  let pi = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const [, rows] of groups) {
    const r = await syncProductGroup(rows, header, pi * 10);
    if (r.unchanged) {
      unchanged += 1;
      console.log(`Unchanged ${r.id} — ${rows[0][colIndex(header, "Product Name")].trim()} (${r.variantCount} variants)`);
    } else if (r.created) {
      created += 1;
      console.log(`Created ${r.id} — ${rows[0][colIndex(header, "Product Name")].trim()} (${r.variantCount} variants)`);
    } else {
      updated += 1;
      console.log(`Updated ${r.id} — ${rows[0][colIndex(header, "Product Name")].trim()} (${r.variantCount} variants)`);
    }
    pi++;
  }

  console.log(`Summary: ${created} created, ${updated} updated, ${unchanged} unchanged.`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
