"use client";

import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostForm } from "@/components/post/PostForm";

export default function SubmitPage() {
  const params = useParams<{ communityName: string }>();
  return (
    <MainLayout showMetaPanel={false}>
      <PostForm communityName={params.communityName} />
    </MainLayout>
  );
}
