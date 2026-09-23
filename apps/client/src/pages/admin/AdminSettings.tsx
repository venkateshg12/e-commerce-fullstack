import { AlertPopup } from "@/components/ui/alert-popup";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
// The account cards are written against the profile response, not against anything storefront
// specific, so the admin shows the same ones rather than a second copy that can drift.
import ChangePasswordForm from "@/components/user/account/ChangePasswordForm";
import ProfileCard from "@/components/user/account/ProfileCard";
import { useAccountProfile } from "@/hooks/account/useAccountProfile";
import { ShieldCheck } from "lucide-react";

const AdminSettings = () => {
  const {
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
    selectAvatarFile,
    savingAvatar,
    passwordForm,
    updatePasswordField,
    submitPasswordChange,
    changingPassword,
    alertPopup,
    setAlertPopup,
  } = useAccountProfile();

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="page-wrap">
      <div className="admin-settings-header">
        <h1 className="admin-settings-heading">Settings</h1>
        <p className="admin-settings-subtitle">
          Your account details and sign-in security.
        </p>
      </div>

      <ProfileCard
        user={user}
        loading={loading}
        isNameEditing={isNameEditing}
        nameDraft={nameDraft}
        setNameDraft={setNameDraft}
        startEditName={startEditName}
        cancelEditName={cancelEditName}
        saveName={saveName}
        savingName={savingName}
        avatarPreview={avatarPreview}
        onSelectAvatarFile={selectAvatarFile}
        savingAvatar={savingAvatar}
      />

      <Card className="account-card">
        <CardHeader>
          <CardTitle className="account-card-title-row">
            <ShieldCheck className="account-card-icon" />
            Account details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !user ? (
            <div className="admin-settings-details">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="admin-settings-details">
              <div className="admin-settings-detail">
                <p className="admin-settings-detail-label">Name</p>
                <p className="admin-settings-detail-value">{user.name || "—"}</p>
              </div>

              <div className="admin-settings-detail">
                <p className="admin-settings-detail-label">Email</p>
                <p className="admin-settings-detail-value">{user.email}</p>
              </div>

              <div className="admin-settings-detail">
                <p className="admin-settings-detail-label">Role</p>
                <p className="admin-settings-detail-value">
                  <Badge variant="secondary">{user.role}</Badge>
                </p>
              </div>

              <div className="admin-settings-detail">
                <p className="admin-settings-detail-label">Email status</p>
                <p className="admin-settings-detail-value">
                  <Badge variant={user.verified ? "default" : "outline"}>
                    {user.verified ? "Verified" : "Unverified"}
                  </Badge>
                </p>
              </div>

              <div className="admin-settings-detail">
                <p className="admin-settings-detail-label">Signs in with</p>
                <p className="admin-settings-detail-value">
                  {user.authProvider === "google" ? "Google" : "Email & password"}
                </p>
              </div>

              <div className="admin-settings-detail">
                <p className="admin-settings-detail-label">Member since</p>
                <p className="admin-settings-detail-value">{memberSince}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ChangePasswordForm
        authProvider={user?.authProvider ?? "local"}
        passwordForm={passwordForm}
        onFieldChange={updatePasswordField}
        onSubmit={submitPasswordChange}
        isPending={changingPassword}
      />

      {alertPopup && (
        <AlertPopup {...alertPopup} onClose={() => setAlertPopup(null)} />
      )}
    </div>
  );
};

export default AdminSettings;
