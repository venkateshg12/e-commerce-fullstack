import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types";
import { Award, Camera, Pencil } from "lucide-react";

type ProfileCardProps = {
  user: User | undefined;
  loading: boolean;
  isNameEditing: boolean;
  nameDraft: string;
  setNameDraft: (value: string) => void;
  startEditName: () => void;
  cancelEditName: () => void;
  saveName: () => void;
  savingName: boolean;
  avatarPreview: string | null;
  onSelectAvatarFile: (file: File | null) => void;
  savingAvatar: boolean;
};

function ProfileCard({
  user,
  loading,
  isNameEditing,
  nameDraft,
  setNameDraft,
  startEditName,
  cancelEditName,
  saveName,
  savingName,
  avatarPreview,
  onSelectAvatarFile,
  savingAvatar,
}: ProfileCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (loading || !user) {
    return (
      <Card className="account-card">
        <CardContent className="flex items-center gap-4">
          <Skeleton className="h-22 w-22 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const initial = (user.name || user.email).charAt(0).toUpperCase();
  const avatarSrc = avatarPreview || user.avatar;

  return (
    <Card className="account-card">
      <CardContent className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="account-avatar-wrap group/avatar">
          <Avatar className="account-avatar">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name || "Profile"} />}
            <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={savingAvatar}
            className="account-avatar-overlay"
            aria-label="Change profile picture"
          >
            <Camera className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => onSelectAvatarFile(event.target.files?.[0] ?? null)}
          />
          {savingAvatar && (
            <div className="account-avatar-uploading">
              Uploading...
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          {isNameEditing ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                autoFocus
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Your name"
                className="sm:max-w-56"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveName} disabled={savingName} className="cursor-pointer">
                  {savingName ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditName} disabled={savingName} className="cursor-pointer">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="account-name-row">
              <h2 className="account-name">{user.name || "Add your name"}</h2>
              <Button size="icon-xs" variant="ghost" onClick={startEditName} aria-label="Edit name" className="cursor-pointer">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <p className="account-email">{user.email}</p>

          <div className="account-badge-row">
            <Badge variant={user.verified ? "default" : "outline"}>
              {user.verified ? "Verified" : "Unverified"}
            </Badge>
            {/* Points are a shopper reward — an admin account never earns any, so the badge is
                left off rather than sitting at zero. */}
            {user.role === "admin" ? null : (
              <Badge variant="secondary" className="account-points-badge">
                <Award className="h-3 w-3" />
                {user.points} points
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProfileCard;
