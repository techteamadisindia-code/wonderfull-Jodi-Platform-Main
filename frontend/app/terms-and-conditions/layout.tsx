import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WonderfulJodi Terms & Conditions',
  description: 'Terms and Conditions governing the use of WonderfulJodi matrimonial and matchmaking services.',
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
