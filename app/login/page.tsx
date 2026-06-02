import { LoginForm } from '@/components/auth/LoginForm';

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectTo = params.redirect || '/app/new';

  return <LoginForm redirectTo={redirectTo} />;
}
