import { Phone, Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallTextActions, ContactLine } from '@/components/leads/lead-quick-actions';
import { telHref, displayPhone } from '@/lib/leads/lead-emails';

export function ContactCard({
  phone,
  email,
  address,
  city,
  state,
  zip,
}: {
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}) {
  const location = [city, state, zip].filter(Boolean).join(', ');
  const hasContact = phone || email || address || location;

  if (!hasContact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No contact details on file.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {phone && (
          <ContactLine
            icon={<Phone className="size-4 shrink-0 text-muted-foreground" />}
            label="Phone"
            value={displayPhone(phone)}
            href={telHref(phone) ?? undefined}
          />
        )}
        {email && (
          <ContactLine
            icon={<Mail className="size-4 shrink-0 text-muted-foreground" />}
            label="Email"
            value={email}
            href={`mailto:${email}`}
          />
        )}
        {(address || location) && (
          <ContactLine
            icon={<MapPin className="size-4 shrink-0 text-muted-foreground" />}
            label="Address"
            value={[address, location].filter(Boolean).join(', ')}
          />
        )}
        {phone && (
          <div className="pt-3">
            <CallTextActions phone={phone} size="default" className="w-full [&>*]:flex-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
