import { useEffect, useState } from "react";
import { useGetProfile } from "@/hooks/auth/useGetProfile";
import { useUpdateProfile } from "./useUpdateProfile";
import { useUpdateAvatar } from "./useUpdateAvatar";
import { useChangePassword } from "./useChangePassword";
import type { AlertType } from "@/types";

export type AccountAlertPopupState = {
    isOpen: boolean;
    type: AlertType;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
};

type PasswordFormState = {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
};

const emptyPasswordForm: PasswordFormState = {
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
};

export function useAccountProfile() {
    const { data: profileResponse, isLoading, isError } = useGetProfile();
    const user = profileResponse?.data?.user;

    const [isNameEditing, setIsNameEditing] = useState(false);
    const [nameDraft, setNameDraft] = useState("");
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm);
    const [alertPopup, setAlertPopup] = useState<AccountAlertPopupState | null>(null);

    const updateProfileMutation = useUpdateProfile();
    const updateAvatarMutation = useUpdateAvatar();
    const changePasswordMutation = useChangePassword();

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    function startEditName() {
        setNameDraft(user?.name ?? "");
        setIsNameEditing(true);
    }

    function cancelEditName() {
        setIsNameEditing(false);
    }

    async function saveName() {
        if (!nameDraft.trim()) {
            setAlertPopup({
                isOpen: true,
                type: "warning",
                title: "Name required",
                description: "Please enter a name before saving.",
            });
            return;
        }

        try {
            await updateProfileMutation.mutateAsync({ name: nameDraft.trim() });
            setIsNameEditing(false);
        } catch (error: any) {
            setAlertPopup({
                isOpen: true,
                type: "error",
                title: "Update failed",
                description: error?.message || "Failed to update your name.",
            });
        }
    }

    function selectAvatarFile(file: File | null) {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);

        if (!file) {
            setAvatarPreview(null);
            return;
        }

        setAvatarPreview(URL.createObjectURL(file));
        updateAvatarMutation.mutate(file, {
            onError: (error: any) => {
                setAlertPopup({
                    isOpen: true,
                    type: "error",
                    title: "Upload failed",
                    description: error?.message || "Failed to update your profile picture.",
                });
            },
        });
    }

    function updatePasswordField(key: keyof PasswordFormState, value: string) {
        setPasswordForm((prev) => ({ ...prev, [key]: value }));
    }

    async function submitPasswordChange() {
        const { currentPassword, newPassword, confirmNewPassword } = passwordForm;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setAlertPopup({
                isOpen: true,
                type: "warning",
                title: "Missing fields",
                description: "Please fill in all password fields.",
            });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setAlertPopup({
                isOpen: true,
                type: "warning",
                title: "Passwords don't match",
                description: "New password and confirm password must match.",
            });
            return;
        }

        try {
            const response = await changePasswordMutation.mutateAsync(passwordForm);
            setPasswordForm(emptyPasswordForm);
            setAlertPopup({
                isOpen: true,
                type: "success",
                title: "Password changed",
                description: response.data.message,
            });
        } catch (error: any) {
            setAlertPopup({
                isOpen: true,
                type: "error",
                title: "Change failed",
                description: error?.message || "Failed to change your password.",
            });
        }
    }

    return {
        user,
        loading: isLoading,
        isError,

        isNameEditing,
        nameDraft,
        setNameDraft,
        startEditName,
        cancelEditName,
        saveName,
        savingName: updateProfileMutation.isPending,

        avatarPreview,
        selectAvatarFile,
        savingAvatar: updateAvatarMutation.isPending,

        passwordForm,
        updatePasswordField,
        submitPasswordChange,
        changingPassword: changePasswordMutation.isPending,

        alertPopup,
        setAlertPopup,
    };
}

export default useAccountProfile;
