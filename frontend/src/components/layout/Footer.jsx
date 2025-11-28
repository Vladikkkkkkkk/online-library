import { Link } from 'react-router-dom';
import { BookOpen, Github, Mail, Heart } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__main">
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <BookOpen className="footer__logo-icon" />
              <span>Online Library</span>
            </Link>
            <p className="footer__description">
              Your digital gateway to thousands of books. Read, discover, and explore the world of literature.
            </p>
          </div>

          <div className="footer__links">
            <div className="footer__links-group">
              <h4>Library</h4>
              <Link to="/books">All Books</Link>
              <Link to="/categories">Categories</Link>
              <Link to="/books?source=openlibrary">Open Library</Link>
            </div>

            <div className="footer__links-group">
              <h4>Account</h4>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Sign Up</Link>
              <Link to="/library">My Library</Link>
            </div>

            <div className="footer__links-group">
              <h4>Support</h4>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/faq">FAQ</Link>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">
            © {currentYear} Online Library. Made with <Heart size={14} className="footer__heart" /> for readers.
          </p>
          <div className="footer__social">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github size={20} />
            </a>
            <a href="mailto:contact@library.com" aria-label="Email">
              <Mail size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

