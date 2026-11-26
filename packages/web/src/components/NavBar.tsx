import { Link } from 'react-router';
import ProfileIcon from './ProfileIcon';

type NavBarProps = {
  className?: string;
};

export default function NavBar({ className = '' }: NavBarProps) {
  return (
    <header className={`navBar ${className}`}>
      <div className="text-2xl font-bold p-4 align-left">
        <Link to="/calls">ReCall</Link>
      </div>
      <ProfileIcon className="absolute top-4 right-4" />
      <nav aria-label="Main navigation" className="flex gap-4 px-4 pb-3 text-sm font-medium">
        <Link to="/calls" className="hover:underline">
          Calls
        </Link>
        <Link to="/calls/new" className="hover:underline">
          Import call
        </Link>
      </nav>
    </header>
  );
}
