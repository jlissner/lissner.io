type CardProps = {
  title?: string | React.JSX.Element;
  children: string | React.JSX.Element;
};

export function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      {title && <h3 className="card--title">{title}</h3>}
      {children}
    </div>
  );
}
