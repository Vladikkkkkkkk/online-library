import BookCard from './BookCard';
import { Loader } from '../common';
import './BookGrid.css';

const BookGrid = ({ 
  books = [], 
  loading = false, 
  emptyMessage = 'No books found',
  onSave,
  onRemove,
  savedBooks = [],
  showActions = true,
}) => {
  if (loading) {
    return (
      <div className="book-grid__loading">
        <Loader size="lg" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="book-grid__empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="book-grid">
      {books.map((book) => (
        <BookCard
          key={book.id || book.openLibraryId}
          book={book}
          onSave={onSave}
          onRemove={onRemove}
          isSaved={savedBooks.includes(book.id || book.openLibraryId)}
          showActions={showActions}
        />
      ))}
    </div>
  );
};

export default BookGrid;

