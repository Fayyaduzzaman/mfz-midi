import { createClient, type RealtimeChannel, type Session, type SupabaseClient } from '@supabase/supabase-js';

export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ProfileRow {
  created_at: string;
  display_name: string | null;
  email: string | null;
  id: string;
  is_admin: boolean;
}

export interface AccessRegistryRow {
  created_at: string;
  email: string;
  granted_by: string | null;
  note: string | null;
  status: 'approved' | 'blocked';
  updated_at: string;
}

export interface ProjectMidiJson {
  notes: Array<{
    duration: number;
    id: string;
    midi: number;
    pitch: string;
    time: number;
    velocity: number;
  }>;
  tempo: number;
}

export interface ProjectRow {
  created_at: string;
  description: string | null;
  id: string;
  midi_json: ProjectMidiJson;
  name: string;
  owner_id: string;
  storage_refs: string[] | null;
  updated_at: string;
}

export interface SoundfontRow {
  approved_by: string | null;
  bucket: string;
  created_at: string;
  id: string;
  label: string;
  mime_type: string;
  owner_id: string;
  size_bytes: number;
  status: 'approved' | 'pending' | 'rejected';
  storage_path: string;
  updated_at: string;
}

export interface SiteSettingRow {
  key: string;
  updated_at: string;
  value: JsonValue;
}

export interface CollaborationRoomRow {
  created_at: string;
  created_by: string | null;
  id: string;
  name: string;
  updated_at: string;
}

export interface CollaborationMessageRow {
  author_id: string | null;
  author_name: string;
  created_at: string;
  id: string;
  message: string;
  room_id: string;
}

export interface QueryResult<TData> {
  data: TData | null;
  error: Error | null;
}

interface Database {
  access_registry: {
    Insert: Pick<AccessRegistryRow, 'email' | 'status'> &
      Partial<Pick<AccessRegistryRow, 'granted_by' | 'note'>>;
  };
  collaboration_messages: {
    Insert: Pick<CollaborationMessageRow, 'author_id' | 'author_name' | 'message' | 'room_id'>;
  };
  collaboration_rooms: {
    Insert: Pick<CollaborationRoomRow, 'created_by' | 'name'>;
  };
  profiles: {
    Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id'>;
  };
  projects: {
    Insert: Omit<ProjectRow, 'created_at' | 'id' | 'updated_at'>;
    Update: Partial<Omit<ProjectRow, 'created_at' | 'id'>>;
  };
  site_settings: {
    Insert: SiteSettingRow;
  };
  soundfonts: {
    Insert: Pick<
      SoundfontRow,
      'bucket' | 'label' | 'mime_type' | 'owner_id' | 'size_bytes' | 'storage_path'
    > &
      Partial<Pick<SoundfontRow, 'approved_by' | 'status'>>;
  };
}

const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder.placeholder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fallbackUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fallbackAnonKey;

let browserClient: SupabaseClient | null = null;

function toError(error: { message: string } | null | undefined) {
  return error ? new Error(error.message) : null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isSupabaseConfigured() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    });
  }

  return browserClient;
}

export async function getCurrentSession() {
  return getSupabaseClient().auth.getSession();
}

export async function signInWithMagicLink(email: string, redirectTo: string) {
  return getSupabaseClient().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo
    }
  });
}

export async function signInWithPassword(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, redirectTo: string) {
  return getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo
    }
  });
}

export async function signOutUser() {
  return getSupabaseClient().auth.signOut();
}

interface EmailAccessState {
  allowed: boolean;
  blocked: boolean;
}

export async function checkEmailAccess(email: string): Promise<QueryResult<EmailAccessState>> {
  const normalizedEmail = normalizeEmail(email);

  const [allowedResult, blockedResult] = await Promise.all([
    getSupabaseClient().rpc('is_email_allowed', { input_email: normalizedEmail }),
    getSupabaseClient().rpc('is_email_blocked', { input_email: normalizedEmail })
  ]);

  const error = toError(allowedResult.error) ?? toError(blockedResult.error);
  if (error) {
    return {
      data: null,
      error
    };
  }

  return {
    data: {
      allowed: Boolean(allowedResult.data),
      blocked: Boolean(blockedResult.data)
    },
    error: null
  };
}

export async function getProfileByUserId(userId: string): Promise<QueryResult<ProfileRow>> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return {
    data: (data as ProfileRow | null) ?? null,
    error: toError(error)
  };
}

export async function upsertUserProfile(
  profile: Database['profiles']['Insert']
): Promise<QueryResult<ProfileRow>> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .upsert(profile)
    .select('*')
    .maybeSingle();

  return {
    data: (data as ProfileRow | null) ?? null,
    error: toError(error)
  };
}

export async function listAllProfiles(): Promise<QueryResult<ProfileRow[]>> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return {
    data: (data as ProfileRow[] | null) ?? null,
    error: toError(error)
  };
}

export async function listAccessRegistry(): Promise<QueryResult<AccessRegistryRow[]>> {
  const { data, error } = await getSupabaseClient()
    .from('access_registry')
    .select('*')
    .order('created_at', { ascending: false });

  return {
    data: (data as AccessRegistryRow[] | null) ?? null,
    error: toError(error)
  };
}

export async function getAccessEntryByEmail(email: string): Promise<QueryResult<AccessRegistryRow>> {
  const { data, error } = await getSupabaseClient()
    .from('access_registry')
    .select('*')
    .eq('email', normalizeEmail(email))
    .maybeSingle();

  return {
    data: (data as AccessRegistryRow | null) ?? null,
    error: toError(error)
  };
}

export async function upsertAccessRegistryEntry(
  entry: Database['access_registry']['Insert']
): Promise<QueryResult<AccessRegistryRow>> {
  const payload = {
    ...entry,
    email: normalizeEmail(entry.email)
  };

  const { data, error } = await getSupabaseClient()
    .from('access_registry')
    .upsert(payload, { onConflict: 'email' })
    .select('*')
    .maybeSingle();

  return {
    data: (data as AccessRegistryRow | null) ?? null,
    error: toError(error)
  };
}

export async function listProjectsForUser(ownerId: string): Promise<QueryResult<ProjectRow[]>> {
  const { data, error } = await getSupabaseClient()
    .from('projects')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });

  return {
    data: (data as ProjectRow[] | null) ?? null,
    error: toError(error)
  };
}

export async function createProjectRecord(
  project: Database['projects']['Insert']
): Promise<QueryResult<ProjectRow>> {
  const { data, error } = await getSupabaseClient()
    .from('projects')
    .insert(project)
    .select('*')
    .maybeSingle();

  return {
    data: (data as ProjectRow | null) ?? null,
    error: toError(error)
  };
}

export async function updateProjectRecord(
  projectId: string,
  project: Database['projects']['Update']
): Promise<QueryResult<ProjectRow>> {
  const { data, error } = await getSupabaseClient()
    .from('projects')
    .update(project)
    .eq('id', projectId)
    .select('*')
    .maybeSingle();

  return {
    data: (data as ProjectRow | null) ?? null,
    error: toError(error)
  };
}

interface UploadAssetResult {
  bucket: string;
  path: string;
}

export async function uploadInstrumentAsset(
  file: File,
  ownerId: string,
  bucket = 'instrument_uploads'
): Promise<QueryResult<UploadAssetResult>> {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/\.+/g, '.');
  const storagePath = `${ownerId}/${Date.now()}-${safeFileName}`;

  const { error } = await getSupabaseClient().storage
    .from(bucket)
    .upload(storagePath, file, { upsert: false });

  if (error) {
    return {
      data: null,
      error: new Error(error.message)
    };
  }

  return {
    data: {
      bucket,
      path: storagePath
    },
    error: null
  };
}

export async function createSoundfontUpload(
  upload: Database['soundfonts']['Insert']
): Promise<QueryResult<SoundfontRow>> {
  const { data, error } = await getSupabaseClient()
    .from('soundfonts')
    .insert(upload)
    .select('*')
    .maybeSingle();

  return {
    data: (data as SoundfontRow | null) ?? null,
    error: toError(error)
  };
}

export async function listPendingSoundfontUploads(): Promise<QueryResult<SoundfontRow[]>> {
  const { data, error } = await getSupabaseClient()
    .from('soundfonts')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return {
    data: (data as SoundfontRow[] | null) ?? null,
    error: toError(error)
  };
}

export async function listApprovedSoundfonts(): Promise<QueryResult<SoundfontRow[]>> {
  const { data, error } = await getSupabaseClient()
    .from('soundfonts')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  return {
    data: (data as SoundfontRow[] | null) ?? null,
    error: toError(error)
  };
}

export async function listUserSoundfontUploads(ownerId: string): Promise<QueryResult<SoundfontRow[]>> {
  const { data, error } = await getSupabaseClient()
    .from('soundfonts')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  return {
    data: (data as SoundfontRow[] | null) ?? null,
    error: toError(error)
  };
}

export async function getUserSoundfontUsageBytes(ownerId: string): Promise<QueryResult<number>> {
  const { data, error } = await getSupabaseClient()
    .from('soundfonts')
    .select('size_bytes, status')
    .eq('owner_id', ownerId);

  if (error) {
    return {
      data: null,
      error: toError(error)
    };
  }

  const rows = (data as Array<{ size_bytes: number; status: SoundfontRow['status'] }> | null) ?? [];
  const totalBytes = rows
    .filter((row) => row.status !== 'rejected')
    .reduce((sum, row) => sum + Math.max(0, row.size_bytes), 0);

  return {
    data: totalBytes,
    error: null
  };
}

export async function updateSoundfontStatus(
  id: string,
  status: SoundfontRow['status'],
  approvedBy: string | null
): Promise<QueryResult<SoundfontRow>> {
  const { data, error } = await getSupabaseClient()
    .from('soundfonts')
    .update({ approved_by: approvedBy, status })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  return {
    data: (data as SoundfontRow | null) ?? null,
    error: toError(error)
  };
}

export async function getSiteSetting(key: string): Promise<QueryResult<SiteSettingRow>> {
  const { data, error } = await getSupabaseClient()
    .from('site_settings')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  return {
    data: (data as SiteSettingRow | null) ?? null,
    error: toError(error)
  };
}

export async function upsertSiteSetting(
  key: string,
  value: JsonValue
): Promise<QueryResult<SiteSettingRow>> {
  const { data, error } = await getSupabaseClient()
    .from('site_settings')
    .upsert({ key, value })
    .select('*')
    .maybeSingle();

  return {
    data: (data as SiteSettingRow | null) ?? null,
    error: toError(error)
  };
}

export async function listCollaborationRooms(): Promise<QueryResult<CollaborationRoomRow[]>> {
  const { data, error } = await getSupabaseClient()
    .from('collaboration_rooms')
    .select('*')
    .order('updated_at', { ascending: false });

  return {
    data: (data as CollaborationRoomRow[] | null) ?? null,
    error: toError(error)
  };
}

export async function createCollaborationRoom(
  room: Database['collaboration_rooms']['Insert']
): Promise<QueryResult<CollaborationRoomRow>> {
  const trimmedName = room.name.trim();
  if (!trimmedName) {
    return {
      data: null,
      error: new Error('Room name is required.')
    };
  }

  const { data, error } = await getSupabaseClient()
    .from('collaboration_rooms')
    .insert({
      ...room,
      name: trimmedName
    })
    .select('*')
    .maybeSingle();

  return {
    data: (data as CollaborationRoomRow | null) ?? null,
    error: toError(error)
  };
}

export async function listRoomMessages(
  roomId: string,
  limit = 120
): Promise<QueryResult<CollaborationMessageRow[]>> {
  const { data, error } = await getSupabaseClient()
    .from('collaboration_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);

  return {
    data: (data as CollaborationMessageRow[] | null) ?? null,
    error: toError(error)
  };
}

export async function postRoomMessage(
  message: Database['collaboration_messages']['Insert']
): Promise<QueryResult<CollaborationMessageRow>> {
  const payload = {
    ...message,
    author_name: message.author_name.trim() || 'member',
    message: message.message.trim()
  };

  if (!payload.message) {
    return {
      data: null,
      error: new Error('Message cannot be empty.')
    };
  }

  const { data, error } = await getSupabaseClient()
    .from('collaboration_messages')
    .insert(payload)
    .select('*')
    .maybeSingle();

  return {
    data: (data as CollaborationMessageRow | null) ?? null,
    error: toError(error)
  };
}

export function subscribeToProjectChanges(
  projectId: string,
  callback: (payload: Record<string, unknown>) => void
): RealtimeChannel {
  return getSupabaseClient()
    .channel(`project:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`
      },
      (payload) => callback(payload as unknown as Record<string, unknown>)
    )
    .subscribe();
}

export function subscribeToRoomMessages(
  roomId: string,
  callback: (payload: Record<string, unknown>) => void
): RealtimeChannel {
  return getSupabaseClient()
    .channel(`collab-room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'collaboration_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => callback(payload as unknown as Record<string, unknown>)
    )
    .subscribe();
}

export async function getServiceRoleSession(): Promise<Session | null> {
  const result = await getCurrentSession();
  return result.data.session ?? null;
}
