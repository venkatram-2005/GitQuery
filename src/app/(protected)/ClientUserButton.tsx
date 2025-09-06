// ClientUserButton.tsx
"use client";

import dynamic from "next/dynamic";

// Load UserButton only on client, disable SSR
const UserButton = dynamic(
  async () => (await import("@clerk/nextjs")).UserButton,
  { ssr: false }
);

export default function ClientUserButton() {
  return <UserButton afterSignOutUrl="/" />;
}
