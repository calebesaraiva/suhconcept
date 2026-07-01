import { useSearchParams } from 'react-router-dom';
import AccountPanel from '../components/ui/AccountPanel';

export default function AccountPage() {
  const [params] = useSearchParams();
  const redirectTo = params.get('redirect') || undefined;

  return <AccountPanel redirectTo={redirectTo} />;
}
