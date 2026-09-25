import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { ROLE_LABELS } from '@/lib/nav';
import {
  changeUserRole,
  setUserStatus,
  resetPassword,
  resendInvite,
  softDeleteUser,
} from '@/lib/actions/team';
import type { UserRow } from '@/lib/data/team';
import type { ContractorOption } from '@/lib/data/contractors';

export function UserActions({
  user,
  contractors,
}: {
  user: UserRow;
  contractors: ContractorOption[];
}) {
  return (
    <div className="space-y-6">
      {/* Role & company */}
      <Card>
        <CardHeader>
          <CardTitle>Role &amp; company</CardTitle>
          <CardDescription>
            Set what this user can do. Contractor users must be linked to a
            company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={changeUserRole}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="user_id" value={user.id} />
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select
                id="role"
                name="role"
                defaultValue={user.role}
                className="w-44"
              >
                {(['admin', 'setter', 'contractor', 'caller'] as const).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contractor_role">Company access</Label>
              <Select
                id="contractor_role"
                name="contractor_role"
                defaultValue={user.contractor_role ?? 'staff'}
                className="w-36"
              >
                <option value="owner">Owner</option>
                <option value="staff">Staff</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                name="can_export_company_data"
                defaultChecked={user.can_export_company_data}
                className="size-4 accent-primary"
              />
              Company export
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="contractor_id">Contractor company</Label>
              <Select
                id="contractor_id"
                name="contractor_id"
                defaultValue={user.contractor_id ?? ''}
                className="w-56"
              >
                <option value="">None (staff)</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Account status <StatusBadge status={user.account_status} />
          </CardTitle>
          <CardDescription>
            Active users can sign in. Suspended and disabled users cannot.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <form action={setUserStatus}>
            <input type="hidden" name="user_id" value={user.id} />
            <input type="hidden" name="status" value="active" />
            <Button type="submit" size="sm" variant="outline">
              Activate
            </Button>
          </form>
          <ConfirmAction
            action={setUserStatus}
            fields={{ user_id: user.id, status: 'suspended' }}
            triggerLabel="Suspend"
            title="Suspend this user?"
            description="They will be signed out and unable to access the platform until reactivated."
            confirmLabel="Suspend"
            destructive
          />
          <ConfirmAction
            action={setUserStatus}
            fields={{ user_id: user.id, status: 'disabled' }}
            triggerLabel="Disable"
            title="Disable this user?"
            description="Disabling blocks all access. You can re-activate them later."
            confirmLabel="Disable"
            destructive
          />
        </CardContent>
      </Card>

      {/* Access & credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Access &amp; credentials</CardTitle>
          <CardDescription>
            Password reset and invitation emails require email to be configured
            in Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ConfirmAction
            action={resetPassword}
            fields={{ user_id: user.id }}
            triggerLabel="Send password reset"
            title="Send a password reset email?"
            description={`A reset link will be emailed to ${user.email}.`}
            confirmLabel="Send reset"
          />
          <form action={resendInvite}>
            <input type="hidden" name="user_id" value={user.id} />
            <Button type="submit" size="sm" variant="outline">
              Resend invitation
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Deleting removes this user from the directory and revokes access. The
            record is kept for audit history (soft delete).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmAction
            action={softDeleteUser}
            fields={{ user_id: user.id }}
            triggerLabel="Delete user"
            title="Delete this user?"
            description="They will lose access immediately and disappear from the directory. This can be reversed in the database if needed."
            confirmLabel="Delete user"
            destructive
          />
        </CardContent>
      </Card>
    </div>
  );
}
