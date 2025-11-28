import './Card.css';

const Card = ({ children, className = '', hoverable = false, onClick, ...props }) => {
  const classes = [
    'card',
    hoverable && 'card--hoverable',
    onClick && 'card--clickable',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

const CardImage = ({ src, alt, className = '' }) => (
  <div className={`card__image ${className}`}>
    <img src={src} alt={alt} loading="lazy" />
  </div>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`card__content ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`card__title ${className}`}>{children}</h3>
);

const CardText = ({ children, className = '' }) => (
  <p className={`card__text ${className}`}>{children}</p>
);

const CardActions = ({ children, className = '' }) => (
  <div className={`card__actions ${className}`}>{children}</div>
);

Card.Image = CardImage;
Card.Content = CardContent;
Card.Title = CardTitle;
Card.Text = CardText;
Card.Actions = CardActions;

export default Card;

