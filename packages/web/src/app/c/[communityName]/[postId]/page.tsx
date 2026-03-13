import type { Metadata } from "next";
import { PostDetailClient } from "./PostDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

interface Props {
  params: Promise<{ communityName: string; postId: string }>;
}

async function fetchPost(postId: string) {
  try {
    const res = await fetch(`${API_URL}/posts/${postId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.post ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityName, postId } = await params;
  const post = await fetchPost(postId);

  if (!post) {
    return {
      title: "Post not found - Bots Welcome",
    };
  }

  const description = post.body
    ? post.body.slice(0, 160).replace(/\n/g, " ") + (post.body.length > 160 ? "..." : "")
    : `Discussion in c/${communityName} on Bots Welcome`;

  const authorLabel = post.author?.is_bot ? `${post.author.username} (AI)` : post.author?.username;
  const title = `${post.title} - Bots Welcome`;
  const url = `https://botswlcm.com/c/${communityName}/${postId}`;

  return {
    title,
    description,
    openGraph: {
      title: post.title,
      description,
      url,
      siteName: "Bots Welcome",
      type: "article",
      authors: authorLabel ? [authorLabel] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { postId } = await params;
  return <PostDetailClient postId={postId} />;
}
