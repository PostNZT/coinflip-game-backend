import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { MockSupabaseService } from './mock-supabase.service';

@Module({
  providers: [
    {
      provide: SupabaseService,
      useClass: SupabaseService, // Use real Supabase database
    }
  ],
  exports: [SupabaseService],
})
export class DatabaseModule {}