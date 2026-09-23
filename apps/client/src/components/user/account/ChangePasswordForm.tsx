import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type ChangePasswordFormProps = {
  authProvider: "local" | "google";
  passwordForm: PasswordFormState;
  onFieldChange: (key: keyof PasswordFormState, value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
};

function ChangePasswordForm({
  authProvider,
  passwordForm,
  onFieldChange,
  onSubmit,
  isPending,
}: ChangePasswordFormProps) {
  return (
    <Card className="account-card">
      <CardHeader>
        <CardTitle className="account-card-title-row">
          <Lock className="account-card-icon" />
          Change password
        </CardTitle>
      </CardHeader>
      <CardContent>
        {authProvider === "google" ? (
          <p className="text-sm text-muted-foreground">
            You signed in with Google, so there's no password to change here.
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => onFieldChange("currentPassword", event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => onFieldChange("newPassword", event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmNewPassword">Confirm new password</FieldLabel>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(event) => onFieldChange("confirmNewPassword", event.target.value)}
                  required
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={isPending} className="mt-4 cursor-pointer">
              {isPending ? "Changing..." : "Change password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default ChangePasswordForm;
