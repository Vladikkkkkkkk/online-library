import { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { booksApi } from '../../api/books';
import { categoriesApi } from '../../api/categories';
import { Button, Input, Loader } from '../../components/common';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import './Admin.css';

const BookForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const initializedRef = useRef(false);

  const { data: bookData, isLoading: bookLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksApi.getById(id, 'local'),
    enabled: isEditing,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const book = bookData?.data;
  
  // Compute initial categories from book data
  const initialCategories = useMemo(() => {
    return book?.categories?.map((c) => c.id) || [];
  }, [book?.categories]);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm();
  
  const fileUrl = watch('fileUrl');

  // Initialize form when book data loads
  useLayoutEffect(() => {
    if (book && !initializedRef.current) {
      initializedRef.current = true;
      reset({
        title: book.title,
        description: book.description,
        isbn: book.isbn,
        publishYear: book.publishYear,
        publisher: book.publisher,
        language: book.language,
        pageCount: book.pageCount,
        coverUrl: book.coverUrl,
        fileUrl: book.fileUrl,
        fileFormat: book.fileFormat,
      });
      
      // Set file preview if book has file
      if (book.fileUrl) {
        const fileName = book.fileUrl.split('/').pop();
        setFilePreview(fileName);
      }
    }
  }, [book, reset]);
  
  // Sync categories when initialCategories change (separate from form reset)
  useLayoutEffect(() => {
    if (initialCategories.length > 0 && selectedCategories.length === 0) {
      // This is intentional - we need to sync form state from external data
      setSelectedCategories(initialCategories);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategories]);

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ bookId, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(`/books/${bookId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createBook(data),
    onSuccess: async (data) => {
      const bookId = data.data?.id;
      
      // If there's a file to upload, upload it
      if (selectedFile && bookId) {
        try {
          await uploadFileMutation.mutateAsync({ bookId, file: selectedFile });
          toast.success('Книгу створено та файл завантажено');
        } catch (error) {
          toast.error('Книгу створено, але помилка завантаження файлу: ' + (error.message || 'невідома помилка'));
        }
      } else {
        toast.success('Книгу створено');
      }
      
      navigate('/admin/books');
    },
    onError: (error) => {
      toast.error(error.message || 'Помилка створення книги');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => adminApi.updateBook(id, data),
    onSuccess: async () => {
      // If there's a file to upload, upload it
      if (selectedFile && id) {
        try {
          await uploadFileMutation.mutateAsync({ bookId: id, file: selectedFile });
          toast.success('Книгу оновлено та файл завантажено');
        } catch (error) {
          toast.error('Книгу оновлено, але помилка завантаження файлу: ' + (error.message || 'невідома помилка'));
        }
      } else {
        toast.success('Книгу оновлено');
      }
      
      navigate('/admin/books');
    },
    onError: (error) => {
      toast.error(error.message || 'Помилка оновлення книги');
    },
  });

  const onSubmit = (data) => {
    // Normalize empty strings to null for optional fields
    const normalizeField = (value) => {
      if (value === '' || value === undefined) return null;
      return value;
    };

    const bookData = {
      ...data,
      title: data.title?.trim(),
      description: normalizeField(data.description),
      isbn: normalizeField(data.isbn),
      publisher: normalizeField(data.publisher),
      coverUrl: normalizeField(data.coverUrl),
      fileUrl: normalizeField(data.fileUrl),
      fileFormat: normalizeField(data.fileFormat),
      publishYear: data.publishYear ? parseInt(data.publishYear, 10) : null,
      pageCount: data.pageCount ? parseInt(data.pageCount, 10) : null,
      categoryIds: selectedCategories,
      // If file is selected, remove fileUrl as it will be set after upload
      ...(selectedFile && { fileUrl: null, fileFormat: null }),
    };

    if (isEditing) {
      updateMutation.mutate(bookData);
    } else {
      createMutation.mutate(bookData);
    }
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type - only PDF allowed
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (fileExtension !== 'pdf') {
        toast.error('Невірний формат файлу. Дозволений тільки формат PDF');
        return;
      }
      
      // Validate file size (50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Файл занадто великий. Максимальний розмір: 50MB');
        return;
      }
      
      setSelectedFile(file);
      setFilePreview(file.name);
      
      // Auto-set file format based on extension
      const formatMap = {
        'pdf': 'PDF',
        'epub': 'EPUB',
        'mobi': 'MOBI',
        'fb2': 'FB2',
      };
      if (formatMap[fileExtension]) {
        reset({ ...watch(), fileFormat: formatMap[fileExtension] });
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const categories = categoriesData?.data || [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending || uploadFileMutation.isPending;

  if (isEditing && bookLoading) {
    return (
      <div className="admin-loading">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="admin-books" style={{ maxWidth: '800px' }}>
      <Link to="/admin/books" className="settings__back">
        <ArrowLeft size={18} />
        Назад до списку книг
      </Link>

      <h1 className="admin-books__title" style={{ marginBottom: '2rem' }}>
        {isEditing ? 'Редагування книги' : 'Нова книга'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="settings__panel">
        <div className="settings__form">
          <div className="settings__form-group">
            <label htmlFor="title">Назва книги *</label>
            <Input
              id="title"
              placeholder="Введіть назву книги"
              {...register('title', { required: "Назва обов'язкова" })}
              error={errors.title?.message}
            />
          </div>

          <div className="settings__form-group">
            <label htmlFor="description">Опис</label>
            <textarea
              id="description"
              placeholder="Введіть опис книги"
              rows={4}
              {...register('description')}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '1rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div className="settings__form-row">
            <div className="settings__form-group">
              <label htmlFor="isbn">ISBN</label>
              <Input
                id="isbn"
                placeholder="978-3-16-148410-0"
                {...register('isbn')}
              />
            </div>
            <div className="settings__form-group">
              <label htmlFor="publishYear">Рік видання</label>
              <Input
                id="publishYear"
                type="number"
                placeholder="2024"
                {...register('publishYear', {
                  min: { value: 1000, message: 'Невірний рік' },
                  max: { value: new Date().getFullYear(), message: 'Рік не може бути в майбутньому' },
                })}
                error={errors.publishYear?.message}
              />
            </div>
          </div>

          <div className="settings__form-row">
            <div className="settings__form-group">
              <label htmlFor="language">Мова</label>
              <select
                id="language"
                {...register('language')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '1rem',
                }}
              >
                <option value="uk">Українська</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div className="settings__form-group">
              <label htmlFor="pageCount">Кількість сторінок</label>
              <Input
                id="pageCount"
                type="number"
                placeholder="256"
                {...register('pageCount', {
                  min: { value: 1, message: 'Мінімум 1 сторінка' },
                })}
                error={errors.pageCount?.message}
              />
            </div>
          </div>

          <div className="settings__form-group">
            <label htmlFor="publisher">Видавництво</label>
            <Input
              id="publisher"
              placeholder="Назва видавництва"
              {...register('publisher')}
            />
          </div>

          <div className="settings__form-group">
            <label htmlFor="coverUrl">URL обкладинки</label>
            <Input
              id="coverUrl"
              placeholder="https://example.com/cover.jpg"
              {...register('coverUrl')}
            />
          </div>

          <div className="settings__form-group">
            <label>Файл книги (PDF)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="fileUpload"
                />
                <label
                  htmlFor="fileUpload"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onMouseOut={(e) => e.target.style.borderColor = 'var(--color-border)'}
                >
                  <Upload size={18} />
                  {filePreview ? 'Змінити файл' : 'Вибрати файл'}
                </label>
                {filePreview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      {filePreview}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
              {!filePreview && !fileUrl && (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Або вкажіть URL файлу нижче
                </p>
              )}
            </div>
          </div>

          {!selectedFile && (
            <div className="settings__form-row">
              <div className="settings__form-group">
                <label htmlFor="fileUrl">URL файлу книги</label>
                <Input
                  id="fileUrl"
                  placeholder="https://example.com/book.pdf"
                  {...register('fileUrl')}
                />
              </div>
              <div className="settings__form-group">
                <label htmlFor="fileFormat">Формат файлу</label>
                <select
                  id="fileFormat"
                  {...register('fileFormat')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '1rem',
                  }}
                >
                  <option value="">Виберіть формат</option>
                  <option value="PDF">PDF</option>
                  <option value="EPUB">EPUB</option>
                  <option value="MOBI">MOBI</option>
                  <option value="FB2">FB2</option>
                </select>
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="settings__form-group">
            <label>Категорії</label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              {categories.map((category) => (
                <label
                  key={category.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: selectedCategories.includes(category.id)
                      ? 'var(--color-primary)'
                      : 'var(--color-surface-hover)',
                    color: selectedCategories.includes(category.id)
                      ? 'white'
                      : 'var(--color-text)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    style={{ display: 'none' }}
                  />
                  {category.nameUk || category.name}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" loading={isSubmitting}>
            <Save size={18} />
            {isEditing ? 'Зберегти зміни' : 'Створити книгу'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BookForm;

