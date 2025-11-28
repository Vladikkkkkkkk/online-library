import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  X
} from 'lucide-react';
import { useBook } from '../../hooks';
import { Button, Loader } from '../../components/common';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './BookReader.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const BookReader = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const source = searchParams.get('source') || 'local';

  const { data: bookData, isLoading } = useBook(id, source);
  const book = bookData?.data;

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);

  // Get PDF URL - use proxy endpoint to avoid CORS issues
  // For local books, use direct file URL or proxy
  // For Open Library books, always use proxy endpoint
  const pdfUrl = (() => {
    if (!book) return null;
    
    // Local books - use proxy endpoint for consistency
    if (book.fileUrl && source === 'local') {
      return `${import.meta.env.VITE_API_URL}/books/${id}/read?source=local`;
    }
    
    // Open Library books - use proxy endpoint
    if (source === 'openlibrary') {
      const pdfLink = book.downloadLinks?.find(link => link.format === 'PDF');
      if (pdfLink) {
        // Use proxy endpoint to avoid CORS
        return `${import.meta.env.VITE_API_URL}/books/${id}/read?source=openlibrary`;
      }
    }
    
    return null;
  })();

  useEffect(() => {
    // Try to restore reading progress from localStorage
    const savedProgress = localStorage.getItem(`reading-progress-${id}`);
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setPageNumber(progress.page || 1);
    }
  }, [id]);

  useEffect(() => {
    // Save reading progress
    if (pageNumber && numPages) {
      localStorage.setItem(`reading-progress-${id}`, JSON.stringify({
        page: pageNumber,
        totalPages: numPages,
        timestamp: Date.now(),
      }));
    }
  }, [pageNumber, numPages, id]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't handle if user is typing in input
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setPageNumber((prev) => Math.max(1, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setScale((prev) => Math.min(3, prev + 0.25));
          break;
        case '-':
          e.preventDefault();
          setScale((prev) => Math.max(0.5, prev - 0.25));
          break;
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [numPages]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setError(t('reader.pdfError'));
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.25));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };


  if (isLoading) {
    return (
      <div className="book-reader__loading">
        <Loader size="lg" />
      </div>
    );
  }

  if (!book || !pdfUrl) {
    return (
      <div className="book-reader__error">
        <h2>{t('reader.notFound')}</h2>
        <p>{t('reader.pdfUnavailable')}</p>
        <Link to={`/books/${id}`}>
          <Button>
            <ArrowLeft size={18} />
            {t('reader.backToDetails')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`book-reader ${isFullscreen ? 'book-reader--fullscreen' : ''}`}>
      {/* Header */}
      <header className="book-reader__header">
        <div className="book-reader__header-left">
          <Link to={`/books/${id}${source === 'openlibrary' ? '?source=openlibrary' : ''}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={18} />
              {t('reader.back')}
            </Button>
          </Link>
          <div className="book-reader__book-info">
            <h2 className="book-reader__title">{book.title}</h2>
            {book.authors && (
              <p className="book-reader__author">
                {book.authors.map(a => a.name || a).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="book-reader__header-right">
          <div className="book-reader__shortcuts-hint" title={t('reader.keyboardShortcuts')}>
            ⌨️
          </div>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <X size={18} /> : <Maximize2 size={18} />}
          </Button>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="book-reader__content">
        {error ? (
          <div className="book-reader__error-message">
            <p>{error}</p>
            <p>{t('reader.pdfUnavailable')}</p>
          </div>
        ) : (
          <div className="book-reader__pdf-container">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="book-reader__pdf-loading">
                  <Loader size="lg" />
                  <p>{t('reader.loadingPdf')}</p>
                </div>
              }
              options={{
                cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
                cMapPacked: true,
              }}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="book-reader__page"
              />
            </Document>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="book-reader__controls">
        <div className="book-reader__controls-left">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut size={18} />
          </Button>
          <span className="book-reader__zoom">{Math.round(scale * 100)}%</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3}
          >
            <ZoomIn size={18} />
          </Button>
        </div>

        <div className="book-reader__controls-center">
          <Button
            variant="secondary"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft size={18} />
            {t('reader.prevPage')}
          </Button>
          
          <div className="book-reader__page-info">
            <input
              type="number"
              min="1"
              max={numPages || 1}
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value, 10);
                if (page >= 1 && page <= (numPages || 1)) {
                  setPageNumber(page);
                }
              }}
              className="book-reader__page-input"
            />
            <span> {t('reader.of')} {numPages || '...'}</span>
          </div>

          <Button
            variant="secondary"
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
          >
            {t('reader.nextPage')}
            <ChevronRight size={18} />
          </Button>
        </div>

        <div className="book-reader__controls-right">
          {numPages && (
            <span className="book-reader__progress">
              {t('reader.readProgress', { percent: Math.round((pageNumber / numPages) * 100) })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookReader;

