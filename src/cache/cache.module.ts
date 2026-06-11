import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { ProfileCacheService } from './profile-cache.service';

@Global()
@Module({
  providers: [CacheService, ProfileCacheService],
  exports: [CacheService, ProfileCacheService],
})
export class CacheModule {}
