// This page is intentionally left blank to resolve a build issue.
// Public user profiles are not a feature in this version.

// This function is required by Next.js's static export feature for dynamic routes.
// It tells the build process not to pre-render any specific user pages.
export function generateStaticParams() {
  // Returning a dummy param to satisfy a persistent Next.js build error.
  return [{ userId: 'do-not-render' }];
}

export default function UserProfilePage() {
  return null;
}
