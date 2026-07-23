"use client";

import * as React from "react";
import { Users, AlertTriangle } from "lucide-react";
import { useCommunity } from "@/hooks/useCommunity";
import { ProfileCard } from "@/components/molecules/ProfileCard";
import { EmptyState } from "@/components/molecules/EmptyState";
import { Button } from "@/components/atoms/Button";
import type { Perspective } from "@/types/killer";

interface CommunityTabTemplateProps {
  isActive: boolean;
  perspective?: Perspective;
}

export function CommunityTabTemplate({ isActive, perspective = "survivor" }: CommunityTabTemplateProps) {
  const { profiles, hasMore, loading, loadingMore, error, loadMore, retry } = useCommunity(isActive, perspective);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-dark h-40 animate-pulse p-5" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState icon={AlertTriangle} title="Could not load the community" description={error} />
        <Button variant="default" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No public profiles yet"
        description="Create your profile from the avatar menu to be the first to appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <ProfileCard key={profile.userId} profile={profile} variant="internal" />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="default" onClick={loadMore} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
