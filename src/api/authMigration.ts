import client from "./client";
import type { User } from "./users";

export interface FirebaseProviderEntry {
  provider_id: string;
  uid: string;
  email: string | null;
  display_name: string | null;
}

export interface SourceDbRow {
  uid: string;
  email: string;
  name: string;
  joined_at: string | null;
  deleted_at: string | null;
  has_app_account_token: boolean;
  counts: {
    tasks: number;
    devices: number;
    integrations: number;
    app_store_purchases: number;
  };
}

export interface AuthMigrationPreview {
  target: {
    uid: string;
    email: string;
    name: string;
    provider: string | null;
    firebase_providers: FirebaseProviderEntry[];
  };
  source: {
    uid: string;
    email: string | null;
    firebase_providers: FirebaseProviderEntry[];
    db_row: SourceDbRow | null;
  };
  provider_to_link: {
    provider_id: string;
    uid: string;
    email: string | null;
  } | null;
  blockers: string[];
  warnings: string[];
}

export interface AuthMigrationResult {
  target: User;
  previous_provider: string | null;
  linked_provider: { provider_id: string; uid: string; email: string | null };
  deleted_source_row: boolean;
  warnings: string[];
}

export async function previewAuthMigration(uid: string, source: string) {
  const { data } = await client.get<AuthMigrationPreview>(
    `/users/${uid}/auth-migration/preview`,
    { params: { source } },
  );
  return data;
}

export async function migrateUserAuth(
  uid: string,
  body: { source_uid: string; confirm_delete_source_row?: boolean },
) {
  const { data } = await client.post<AuthMigrationResult>(
    `/users/${uid}/auth-migration`,
    body,
  );
  return data;
}
