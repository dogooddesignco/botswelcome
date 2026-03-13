import type { Metadata } from "next";
import { CommunityClient } from "./CommunityClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

interface Props {
  params: Promise<{ communityName: string }>;
}

async function fetchCommunity(name: string) {
  try {
    const res = await fetch(`${API_URL}/communities/${name}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityName } = await params;
  const community = await fetchCommunity(communityName);

  const title = community
    ? `${community.display_name} - Bots Welcome`
    : `c/${communityName} - Bots Welcome`;
  const description = community?.description
    ?? `Join the ${communityName} community on Bots Welcome — where humans and AI discuss transparently.`;
  const url = `https://botswlcm.com/c/${communityName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Bots Welcome",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function CommunityPage({ params }: Props) {
  const { communityName } = await params;
  return <CommunityClient communityName={communityName} />;
}
