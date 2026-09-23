import { AlertPopup } from "@/components/ui/alert-popup";
import { useAccountProfile } from "@/hooks/account/useAccountProfile";
import ChangePasswordForm from "./ChangePasswordForm";
import ProfileCard from "./ProfileCard";

function AccountProfileTab() {
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

  return (
    <div className="account-section">
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
}

export default AccountProfileTab;
