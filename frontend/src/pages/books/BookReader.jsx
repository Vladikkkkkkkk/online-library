import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getApiUrl } from '../../utils/apiUrl';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './BookReader.css';

// Set up PDF.js worker - use unpkg CDN (more reliable)
// Note: Using .mjs extension as newer versions of pdfjs-dist use ES modules
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

const BookReader = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const source = searchParams.get('source') || 'local';

  const { data: bookData, isLoading } = useBook(id, source);
  const book = bookData?.data;

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);

  // Redirect if trying to read Open Library book
  useEffect(() => {
    if (source === 'openlibrary') {
      navigate(`/books/${id}?source=openlibrary`, { replace: true });
    }
  }, [source, id, navigate]);

  // Get PDF URL - only for local books (useMemo to recalculate when book loads)
  const pdfUrl = useMemo(() => {
    if (!book || source !== 'local') return null;
    
    // Only local books with fileUrl can be read
    if (book.fileUrl) {
      // Use endpoint for reading (better control over headers and CORS)
      const apiUrl = getApiUrl();
      // Add source=local query parameter to ensure correct handling
      return `${apiUrl}/books/${id}/read?source=local`;
    }
    
    return null;
  }, [book, source, id]);

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

  // Define toggleFullscreen before using it
  const toggleFullscreen = useCallback(() => {
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
  }, []);

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
  }, [numPages, toggleFullscreen]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    console.error('PDF URL:', pdfUrl);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    setError(error.message || t('reader.pdfError') || 'Failed to load PDF');
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
          <Link to={`/books/${id}`}>
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
                cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                cMapPacked: true,
                httpHeaders: {
                  'Accept': 'application/pdf',
                },
                withCredentials: false,
              }}
              error={
                <div className="book-reader__error-message">
                  <p>{error || t('reader.pdfError') || 'Failed to load PDF'}</p>
                  <Button onClick={() => window.location.reload()}>
                    Reload Page
                  </Button>
                </div>
              }
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

