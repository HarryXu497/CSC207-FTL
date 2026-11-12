type ProfileIconProps = {
  name?: string;
  className?: string;
};

export default function ProfileIcon({ name, className = '' }: ProfileIconProps) {
  const initials = (str?: string) => {
    if (!str) return 'A';
    const parts = str.split(' ');
    const inits = parts.map((part) => (part[0] ? part[0].toUpperCase() : ' '));
    return inits.join('').slice(0, 2);
  };

  return (
    <div className={`profileIcon ${className} flex justify-center items-center`}>
      <p>{initials(name)}</p>
    </div>
  );
}
