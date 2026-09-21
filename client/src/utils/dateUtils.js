export function formatUploadDate(isoOrDateStr) {
  if (!isoOrDateStr) return 'Recently';

  const date = new Date(isoOrDateStr);
  if (isNaN(date.getTime())) return isoOrDateStr;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Added Today';
  if (diffDays === 1) return 'Added Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `Added ${diffDays} days ago`;

  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return `Uploaded: ${date.toLocaleDateString('en-GB', options)}`;
}
