// This page is intentionally left blank to resolve a build issue.
// Public user profiles are not a feature in this version.

// This function is required by Next.js's static export feature for dynamic routes.
// It tells the build process not to pre-render any specific user pages.
export function generateStaticParams() {
  return [];
}

export default function UserProfilePage() {
  return null;
}
