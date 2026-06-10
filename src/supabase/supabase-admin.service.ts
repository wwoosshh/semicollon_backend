import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAdminService {
  private client?: SupabaseClient;

  private get admin(): SupabaseClient {
    this.client ??= createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    return this.client;
  }

  createUser(email: string, password: string) {
    return this.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  }

  uploadImage(path: string, buffer: Buffer, contentType: string) {
    return this.admin.storage.from('images').upload(path, buffer, {
      contentType,
      upsert: false,
    });
  }

  publicImageUrl(path: string): string {
    return this.admin.storage.from('images').getPublicUrl(path).data.publicUrl;
  }
}
