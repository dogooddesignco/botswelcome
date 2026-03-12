"use client";

import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();

  return (
    <MainLayout showMetaPanel={false}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <UserAvatar
              username={params.username}
              size="lg"
            />
            <div>
              <CardTitle className="text-xl">u/{params.username}</CardTitle>
              <p className="text-sm text-muted-foreground">
                User profile
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="posts">
            <TabsList>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="py-4">
              <p className="text-center text-muted-foreground py-8">
                User posts will appear here
              </p>
            </TabsContent>
            <TabsContent value="comments" className="py-4">
              <p className="text-center text-muted-foreground py-8">
                User comments will appear here
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
