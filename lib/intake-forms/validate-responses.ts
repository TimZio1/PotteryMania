import type { IntakeFieldType, Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

const publicIntakeFormSelect = {
  id: true,
  title: true,
  fieldType: true,
  isRequired: true,
  includeInInvoice: true,
  sortOrder: true,
  options: true,
} satisfies Prisma.IntakeFormSelect;

export type PublicIntakeForm = Prisma.IntakeFormGetPayload<{ select: typeof publicIntakeFormSelect }>;

export type IntakeResponseSnapshot = {
  formId: string;
  label: string;
  fieldType: IntakeFieldType;
  includeInInvoice: boolean;
  value: string;
};

type RawResponseInput = {
  formId: string;
  value: unknown;
};

type ValidationResult =
  | {
      ok: true;
      responses: IntakeResponseSnapshot[];
    }
  | {
      ok: false;
      error: string;
    };

function optionValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);
}

function normalizeRawResponses(raw: unknown): {
  ok: true;
  responses: RawResponseInput[];
} | {
  ok: false;
  error: string;
} {
  if (raw == null) {
    return { ok: true, responses: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Intake responses must be an array" };
  }

  const seen = new Set<string>();
  const responses: RawResponseInput[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Each intake response must be an object" };
    }
    const rec = entry as Record<string, unknown>;
    const formId = typeof rec.formId === "string" ? rec.formId.trim() : "";
    if (!formId) {
      return { ok: false, error: "Each intake response requires a formId" };
    }
    if (seen.has(formId)) {
      return { ok: false, error: "Duplicate intake responses are not allowed" };
    }
    seen.add(formId);
    responses.push({ formId, value: rec.value });
  }

  return { ok: true, responses };
}

export async function getPublicIntakeForms(db: DbClient, experienceId: string): Promise<PublicIntakeForm[]> {
  return db.intakeForm.findMany({
    where: {
      experiences: { some: { experienceId } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: publicIntakeFormSelect,
  });
}

function validateSingleValue(form: PublicIntakeForm, raw: unknown): {
  ok: true;
  value: string;
} | {
  ok: false;
  error: string;
} {
  const label = form.title;

  switch (form.fieldType) {
    case "text_single": {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (form.isRequired && !value) return { ok: false, error: `${label} is required.` };
      if (value.length > 500) return { ok: false, error: `${label} must be 500 characters or fewer.` };
      return { ok: true, value };
    }
    case "text_multi": {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (form.isRequired && !value) return { ok: false, error: `${label} is required.` };
      if (value.length > 5000) return { ok: false, error: `${label} must be 5000 characters or fewer.` };
      return { ok: true, value };
    }
    case "number": {
      const value = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
      if (form.isRequired && !value) return { ok: false, error: `${label} is required.` };
      if (!value) return { ok: true, value: "" };
      if (!/^-?\d+(\.\d+)?$/.test(value)) return { ok: false, error: `${label} must be a valid number.` };
      return { ok: true, value };
    }
    case "checkbox": {
      if (typeof raw !== "boolean") {
        if (!form.isRequired && (raw == null || raw === "")) {
          return { ok: true, value: "false" };
        }
        return { ok: false, error: `${label} must be checked or unchecked.` };
      }
      if (form.isRequired && raw !== true) return { ok: false, error: `${label} must be accepted.` };
      return { ok: true, value: raw ? "true" : "false" };
    }
    case "dropdown": {
      const value = typeof raw === "string" ? raw.trim() : "";
      const options = optionValues(form.options);
      if (form.isRequired && !value) return { ok: false, error: `${label} is required.` };
      if (!value) return { ok: true, value: "" };
      if (!options.includes(value)) return { ok: false, error: `${label} has an invalid option.` };
      return { ok: true, value };
    }
    case "date": {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (form.isRequired && !value) return { ok: false, error: `${label} is required.` };
      if (!value) return { ok: true, value: "" };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: `${label} must be a valid date.` };
      return { ok: true, value };
    }
    case "file_upload": {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (form.isRequired && !value) return { ok: false, error: `${label} is required.` };
      if (!value) return { ok: true, value: "" };
      if (!/^https?:\/\//i.test(value)) return { ok: false, error: `${label} must be an uploaded file URL.` };
      if (value.length > 2000) return { ok: false, error: `${label} file URL is too long.` };
      return { ok: true, value };
    }
    default: {
      const _never: never = form.fieldType;
      return { ok: false, error: `Unsupported intake field type: ${String(_never)}` };
    }
  }
}

export async function validateIntakeResponses(
  db: DbClient,
  experienceId: string,
  raw: unknown,
): Promise<ValidationResult> {
  const normalized = normalizeRawResponses(raw);
  if (!normalized.ok) return normalized;

  const forms = await getPublicIntakeForms(db, experienceId);
  if (forms.length === 0) {
    return { ok: true, responses: [] };
  }

  const byId = new Map(forms.map((form) => [form.id, form] as const));
  const responses: IntakeResponseSnapshot[] = [];

  for (const input of normalized.responses) {
    const form = byId.get(input.formId);
    if (!form) {
      return { ok: false, error: "One of the intake questions is no longer available. Refresh and try again." };
    }
    const valid = validateSingleValue(form, input.value);
    if (!valid.ok) return valid;
    if (!valid.value && !form.isRequired) continue;
    responses.push({
      formId: form.id,
      label: form.title,
      fieldType: form.fieldType,
      includeInInvoice: form.includeInInvoice,
      value: valid.value,
    });
  }

  for (const form of forms) {
    if (form.isRequired && !responses.some((response) => response.formId === form.id)) {
      return { ok: false, error: `${form.title} is required.` };
    }
  }

  return { ok: true, responses };
}

export function coerceIntakeResponseSnapshots(raw: unknown): IntakeResponseSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const responses: IntakeResponseSnapshot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const formId = typeof rec.formId === "string" ? rec.formId : "";
    const label = typeof rec.label === "string" ? rec.label : "";
    const fieldType = typeof rec.fieldType === "string" ? (rec.fieldType as IntakeFieldType) : null;
    const includeInInvoice = rec.includeInInvoice === true;
    const value = typeof rec.value === "string" ? rec.value : "";
    if (!formId || !label || !fieldType) continue;
    responses.push({ formId, label, fieldType, includeInInvoice, value });
  }
  return responses;
}
