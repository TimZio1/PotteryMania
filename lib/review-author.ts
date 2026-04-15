type ReviewAuthorInput = {
  customerProfile?: { fullName?: string | null } | null;
} | null;

export function reviewAuthorLabel(author: ReviewAuthorInput): string {
  const fullName = author?.customerProfile?.fullName?.trim();
  if (fullName) return fullName;
  return "Verified customer";
}
