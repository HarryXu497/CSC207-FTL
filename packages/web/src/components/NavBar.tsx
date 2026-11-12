import ProfileIcon from './ProfileIcon';

type NavBarProps = {
  className?: string;
};

export default function NavBar({ className = '' }: NavBarProps) {
  return (
    <header className={`navBar ${className}`}>
      <h1 className="text-2xl font-bold p-4 align-left">ReCall</h1>
      <ProfileIcon className="absolute top-4 right-4" />
    </header>
  );
}
