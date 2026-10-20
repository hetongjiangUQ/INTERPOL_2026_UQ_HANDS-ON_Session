declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    LOCAL_ADMIN_KEY?: string;
    WORKSHOP_OPEN_ACCESS?: string;
    WORKSHOP_PARTICIPANT_PASSCODE?: string;
    PUBLIC_ORIGIN?: string;
    FILES: R2Bucket;
  }
}
