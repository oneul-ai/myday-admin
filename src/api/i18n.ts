import client from "./client";

export type I18nScope = "app" | "widget";
export type I18nStatus = "draft" | "review" | "published";

export interface I18nTranslation {
  id: number;
  key_id: number;
  locale: string;
  value: string;
  status: I18nStatus;
  updated_by: string | null;
  updated_at: string;
}

export interface I18nKey {
  id: number;
  scope: I18nScope;
  key: string;
  description: string | null;
  deprecated_at: string | null;
  translations: I18nTranslation[];
  created_at: string;
  updated_at: string;
}

export interface I18nBundleMeta {
  id: number;
  scope: I18nScope;
  locale: string;
  version: number;
  published_by: string | null;
  published_at: string;
}

export interface I18nKeysResponse {
  total: number;
  supported_locales: string[];
  keys: I18nKey[];
}

// ---------- Sync ----------

export interface SyncDiffItem {
  key: string;
  description?: string | null;
  ko_value?: string | null;
  resurrect?: boolean;
  old?: string | null;
  new?: string | null;
  value?: string;
}

export interface NonKoClearedItem {
  key: string;
  locales: string[];
}

export interface SyncDiff {
  added: SyncDiffItem[];
  removed: SyncDiffItem[];
  // 이미 deprecated 인 키들. force sync 시에만 hard delete 됨.
  pruned: SyncDiffItem[];
  description_changed: SyncDiffItem[];
  ko_value_changed: SyncDiffItem[];
  non_ko_cleared: NonKoClearedItem[];
  // force sync 시 hard delete 될 (key, locale) 번역. xcstrings 에 해당 locale 이 없음.
  force_translation_deletes: NonKoClearedItem[];
  unchanged: number;
}

export interface SyncPreviewResponse {
  scope: I18nScope;
  total_keys_in_file: number;
  diff: SyncDiff;
}

export interface SyncApplyResponse {
  scope: I18nScope;
  force: boolean;
  applied: {
    added: number;
    resurrected: number;
    removed: number;
    pruned: number;
    updated: number;
    ko_upserted: number;
    non_ko_cleared: number;
    non_ko_upserted: number;
    force_translations_deleted: number;
  };
}

function buildSyncFormData(
  scope: I18nScope,
  file: File,
  options?: { force?: boolean },
): FormData {
  const fd = new FormData();
  fd.append("scope", scope);
  fd.append("file", file);
  if (options?.force) fd.append("force", "true");
  return fd;
}

export async function syncPreview(scope: I18nScope, file: File) {
  const { data } = await client.post<SyncPreviewResponse>(
    "/i18n/sync/preview",
    buildSyncFormData(scope, file),
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function syncApply(
  scope: I18nScope,
  file: File,
  options?: { force?: boolean },
) {
  const { data } = await client.post<SyncApplyResponse>(
    "/i18n/sync/apply",
    buildSyncFormData(scope, file, options),
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

// ---------- Keys ----------

export async function listKeys(params: {
  scope: I18nScope;
  q?: string;
  missing_locale?: string;
  include_deprecated?: boolean;
  offset?: number;
  limit?: number;
}) {
  const { data } = await client.get<I18nKeysResponse>("/i18n/keys", { params });
  return data;
}

export async function createKey(body: {
  scope: I18nScope;
  key: string;
  description?: string | null;
}) {
  const { data } = await client.post<I18nKey>("/i18n/keys", body);
  return data;
}

export async function updateKey(
  id: number,
  body: { description?: string | null; deprecated?: boolean },
) {
  const { data } = await client.patch<I18nKey>(`/i18n/keys/${id}`, body);
  return data;
}

export async function upsertTranslation(
  keyId: number,
  locale: string,
  body: { value: string; status?: I18nStatus },
) {
  const { data } = await client.put<I18nTranslation>(
    `/i18n/keys/${keyId}/translations/${locale}`,
    body,
  );
  return data;
}

export async function patchTranslation(
  id: number,
  body: { value?: string; status?: I18nStatus },
) {
  const { data } = await client.patch<I18nTranslation>(
    `/i18n/translations/${id}`,
    body,
  );
  return data;
}

export async function deleteTranslation(id: number) {
  await client.delete(`/i18n/translations/${id}`);
}

export interface ClearLocaleResponse {
  scope: I18nScope;
  locale: string;
  deleted: number;
}

export async function clearLocale(scope: I18nScope, locale: string) {
  const { data } = await client.post<ClearLocaleResponse>("/i18n/clear-locale", {
    scope,
    locale,
  });
  return data;
}

export interface AutoTranslateResponse {
  key_id: number;
  filled: { locale: string; value: string }[];
  skipped: string[];
  model: string | null;
  key: I18nKey;
}

export async function autoTranslateKey(
  keyId: number,
  options?: { model_id?: string },
) {
  const { data } = await client.post<AutoTranslateResponse>(
    `/i18n/keys/${keyId}/auto-translate`,
    options ?? {},
  );
  return data;
}

export interface TranslatableResponse {
  scope: I18nScope;
  locale: string | null;
  count: number;
  key_ids: number[];
}

export async function getTranslatableKeys(scope: I18nScope, locale?: string) {
  const { data } = await client.get<TranslatableResponse>(
    "/i18n/keys/translatable",
    { params: { scope, ...(locale ? { locale } : {}) } },
  );
  return data;
}

export interface BulkAutoTranslateResponse {
  scope: I18nScope;
  locale: string | null;
  total: number;
  success: number;
  no_op: number;
  total_filled: number;
  errors: { key_id: number; detail: string }[];
  duration_seconds: number;
  model: string | null;
  // 청크 단위로 묶어서 호출한 LLM 횟수. 키 수 / chunk_size.
  llm_calls?: number;
}

export async function bulkAutoTranslate(
  scope: I18nScope,
  options?: {
    locale?: string;
    key_ids?: number[];
    model_id?: string;
    chunk_size?: number;
  },
) {
  // LLM bulk call can take several minutes — disable axios timeout for this request.
  const { data } = await client.post<BulkAutoTranslateResponse>(
    "/i18n/bulk-auto-translate",
    { scope, ...(options ?? {}) },
    { timeout: 0 },
  );
  return data;
}

// ---------- Publish / Diff ----------

export interface PublishDiffItem {
  key: string;
  value?: string;
  old?: string;
  new?: string;
}

export interface PublishDiffResponse {
  previous_version: number | null;
  added: PublishDiffItem[];
  removed: PublishDiffItem[];
  changed: PublishDiffItem[];
  unchanged: number;
}

export async function getPublishDiff(scope: I18nScope, locale: string) {
  const { data } = await client.get<PublishDiffResponse>("/i18n/diff", {
    params: { scope, locale },
  });
  return data;
}

export interface PublishResponse extends I18nBundleMeta {
  key_count: number;
}

export async function publishBundle(scope: I18nScope, locale: string) {
  const { data } = await client.post<PublishResponse>("/i18n/publish", {
    scope,
    locale,
  });
  return data;
}

export async function listBundles(scope: I18nScope, locale: string, limit = 20) {
  const { data } = await client.get<{ bundles: I18nBundleMeta[] }>(
    "/i18n/bundles",
    { params: { scope, locale, limit } },
  );
  return data;
}

export interface PublishStatusRow {
  scope: I18nScope;
  locale: string;
  latest_version: number | null;
  latest_published_at: string | null;
  latest_published_by: string | null;
  publishable_key_count: number;
  diff: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
}

export interface PublishStatusResponse {
  scopes: I18nScope[];
  locales: string[];
  rows: PublishStatusRow[];
}

export async function getPublishStatus() {
  const { data } = await client.get<PublishStatusResponse>("/i18n/publish-status");
  return data;
}

export interface DraftCountsResponse {
  scope: I18nScope;
  count: number;
  by_locale: Record<string, number>;
}

export async function getDraftCounts(scope: I18nScope) {
  const { data } = await client.get<DraftCountsResponse>("/i18n/drafts", {
    params: { scope },
  });
  return data;
}

export interface BulkPromoteDraftsResponse {
  scope: I18nScope;
  promoted: number;
}

export async function bulkPromoteDrafts(scope: I18nScope) {
  const { data } = await client.post<BulkPromoteDraftsResponse>(
    "/i18n/bulk-promote-drafts",
    { scope },
  );
  return data;
}
