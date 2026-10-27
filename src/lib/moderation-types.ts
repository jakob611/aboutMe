/** Private admin API shapes. These types contain no runtime secrets or storage access. */
export type SubmissionModeration = {
  fingerprint: string;
  country: string | null;
  region: string | null;
  city: string | null;
  capturedAt: string;
  blocked: boolean;
};

export type AdminBlock = { fingerprint: string; createdAt: string; reason: string };
