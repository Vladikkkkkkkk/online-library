import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Translations
const translations = {
  uk: {
    // Navigation
    'nav.home': 'Головна',
    'nav.books': 'Книги',
    'nav.categories': 'Категорії',
    'nav.library': 'Моя бібліотека',
    'nav.profile': 'Профіль',
    'nav.settings': 'Налаштування',
    'nav.admin': 'Адмін панель',
    'nav.login': 'Увійти',
    'nav.register': 'Реєстрація',
    'nav.logout': 'Вийти',

    // Home page
    'home.hero.title': 'Відкрийте свою наступну',
    'home.hero.titleHighlight': 'улюблену книгу',
    'home.hero.description': 'Досліджуйте тисячі книг з нашої цифрової бібліотеки. Шукайте, читайте та завантажуйте улюблені видання будь-де і будь-коли.',
    'home.hero.browse': 'Переглянути бібліотеку',
    'home.hero.getStarted': 'Почати безкоштовно',
    'home.features.search': 'Розумний пошук',
    'home.features.searchDesc': 'Знаходьте книги за назвою, автором, жанром або ISBN',
    'home.features.collection': 'Велика колекція',
    'home.features.collectionDesc': 'Доступ до мільйонів книг з Open Library',
    'home.features.download': 'Легке завантаження',
    'home.features.downloadDesc': 'Завантажуйте книги в PDF, EPUB та інших форматах',
    'home.features.personal': 'Особиста бібліотека',
    'home.features.personalDesc': 'Зберігайте улюблені книги та створюйте свою колекцію',
    'home.trending': 'Популярне цього тижня',
    'home.categories': 'Категорії',
    'home.viewAll': 'Переглянути всі',
    'home.cta.title': 'Готові почати читати?',
    'home.cta.description': 'Створіть безкоштовний акаунт та починайте будувати свою бібліотеку вже сьогодні.',
    'home.cta.signup': 'Зареєструватися',

    // Auth
    'auth.login': 'Вхід',
    'auth.register': 'Реєстрація',
    'auth.email': 'Email',
    'auth.password': 'Пароль',
    'auth.confirmPassword': 'Підтвердіть пароль',
    'auth.firstName': "Ім'я",
    'auth.lastName': 'Прізвище',
    'auth.loginButton': 'Увійти',
    'auth.registerButton': 'Зареєструватися',
    'auth.noAccount': 'Немає акаунту?',
    'auth.hasAccount': 'Вже є акаунт?',
    'auth.forgotPassword': 'Забули пароль?',

    // Books
    'books.title': 'Бібліотека книг',
    'books.search': 'Пошук книг...',
    'books.filters': 'Фільтри',
    'books.category': 'Категорія',
    'books.language': 'Мова',
    'books.year': 'Рік',
    'books.noResults': 'Книги не знайдено',
    'books.download': 'Завантажити',
    'books.save': 'Зберегти',
    'books.saved': 'Збережено',
    'books.pages': 'сторінок',
    'books.description': 'Опис',
    'books.author': 'Автор',
    'books.publisher': 'Видавництво',

    // Profile
    'profile.title': 'Профіль',
    'profile.stats': 'Статистика',
    'profile.savedBooks': 'Збережених книг',
    'profile.downloads': 'Завантажень',
    'profile.reading': 'Читаю зараз',
    'profile.quickLinks': 'Швидкі посилання',
    'profile.myLibrary': 'Моя бібліотека',
    'profile.catalog': 'Каталог книг',
    'profile.registered': 'Зареєстровано',

    // Settings
    'settings.title': 'Налаштування',
    'settings.profile': 'Профіль',
    'settings.security': 'Безпека',
    'settings.editProfile': 'Редагування профілю',
    'settings.changePassword': 'Зміна пароля',
    'settings.currentPassword': 'Поточний пароль',
    'settings.newPassword': 'Новий пароль',
    'settings.saveChanges': 'Зберегти зміни',

    // Library
    'library.title': 'Моя бібліотека',
    'library.empty': 'Бібліотека порожня',
    'library.emptyDesc': 'Збережіть книги, які вас цікавлять, щоб швидко повертатися до них пізніше.',
    'library.goToCatalog': 'Перейти до каталогу',
    'library.searchPlaceholder': 'Пошук у бібліотеці...',

    // Admin
    'admin.dashboard': 'Панель адміністратора',
    'admin.overview': 'Огляд системи та управління контентом',
    'admin.totalBooks': 'Всього книг',
    'admin.totalUsers': 'Користувачів',
    'admin.totalDownloads': 'Завантажень',
    'admin.totalCategories': 'Категорій',
    'admin.quickActions': 'Швидкі дії',
    'admin.manageBooks': 'Управління книгами',
    'admin.manageUsers': 'Управління користувачами',
    'admin.importBooks': 'Імпорт з Open Library',
    'admin.manageCategories': 'Управління категоріями',
    'admin.recentActivity': 'Остання активність',
    'admin.addBook': 'Додати книгу',

    // Common
    'common.loading': 'Завантаження...',
    'common.error': 'Помилка',
    'common.success': 'Успішно',
    'common.cancel': 'Скасувати',
    'common.save': 'Зберегти',
    'common.delete': 'Видалити',
    'common.edit': 'Редагувати',
    'common.back': 'Назад',
    'common.next': 'Далі',
    'common.previous': 'Назад',
    'common.search': 'Пошук',
    'common.all': 'Всі',
    'common.books': 'книг',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.books': 'Books',
    'nav.categories': 'Categories',
    'nav.library': 'My Library',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin Panel',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.logout': 'Logout',

    // Home page
    'home.hero.title': 'Discover Your Next',
    'home.hero.titleHighlight': 'Great Read',
    'home.hero.description': 'Explore thousands of books from our digital library. Search, read, and download your favorite titles anytime, anywhere.',
    'home.hero.browse': 'Browse Library',
    'home.hero.getStarted': 'Get Started Free',
    'home.features.search': 'Smart Search',
    'home.features.searchDesc': 'Find books by title, author, genre, or ISBN',
    'home.features.collection': 'Vast Collection',
    'home.features.collectionDesc': 'Access millions of books from Open Library',
    'home.features.download': 'Easy Downloads',
    'home.features.downloadDesc': 'Download books in PDF, EPUB and other formats',
    'home.features.personal': 'Personal Library',
    'home.features.personalDesc': 'Save your favorites and build your reading collection',
    'home.trending': 'Trending This Week',
    'home.categories': 'Browse by Category',
    'home.viewAll': 'View All',
    'home.cta.title': 'Ready to Start Reading?',
    'home.cta.description': 'Create a free account and start building your personal library today.',
    'home.cta.signup': 'Sign Up Free',

    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.loginButton': 'Sign In',
    'auth.registerButton': 'Create Account',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.forgotPassword': 'Forgot password?',

    // Books
    'books.title': 'Book Library',
    'books.search': 'Search books...',
    'books.filters': 'Filters',
    'books.category': 'Category',
    'books.language': 'Language',
    'books.year': 'Year',
    'books.noResults': 'No books found',
    'books.download': 'Download',
    'books.save': 'Save',
    'books.saved': 'Saved',
    'books.pages': 'pages',
    'books.description': 'Description',
    'books.author': 'Author',
    'books.publisher': 'Publisher',

    // Profile
    'profile.title': 'Profile',
    'profile.stats': 'Statistics',
    'profile.savedBooks': 'Saved Books',
    'profile.downloads': 'Downloads',
    'profile.reading': 'Reading Now',
    'profile.quickLinks': 'Quick Links',
    'profile.myLibrary': 'My Library',
    'profile.catalog': 'Book Catalog',
    'profile.registered': 'Registered',

    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.security': 'Security',
    'settings.editProfile': 'Edit Profile',
    'settings.changePassword': 'Change Password',
    'settings.currentPassword': 'Current Password',
    'settings.newPassword': 'New Password',
    'settings.saveChanges': 'Save Changes',

    // Library
    'library.title': 'My Library',
    'library.empty': 'Library is empty',
    'library.emptyDesc': 'Save books you like to quickly access them later.',
    'library.goToCatalog': 'Go to Catalog',
    'library.searchPlaceholder': 'Search in library...',

    // Admin
    'admin.dashboard': 'Admin Dashboard',
    'admin.overview': 'System overview and content management',
    'admin.totalBooks': 'Total Books',
    'admin.totalUsers': 'Users',
    'admin.totalDownloads': 'Downloads',
    'admin.totalCategories': 'Categories',
    'admin.quickActions': 'Quick Actions',
    'admin.manageBooks': 'Manage Books',
    'admin.manageUsers': 'Manage Users',
    'admin.importBooks': 'Import from Open Library',
    'admin.manageCategories': 'Manage Categories',
    'admin.recentActivity': 'Recent Activity',
    'admin.addBook': 'Add Book',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.search': 'Search',
    'common.all': 'All',
    'common.books': 'books',
  },
};

const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'uk', // Default language
      
      // Get translation
      t: (key) => {
        const lang = get().language;
        return translations[lang]?.[key] || translations.uk[key] || key;
      },

      // Set language
      setLanguage: (lang) => {
        if (translations[lang]) {
          set({ language: lang });
        }
      },

      // Toggle language
      toggleLanguage: () => {
        const current = get().language;
        set({ language: current === 'uk' ? 'en' : 'uk' });
      },

      // Get available languages
      languages: [
        { code: 'uk', name: 'Українська', flag: '🇺🇦' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
      ],
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ language: state.language }),
    }
  )
);

export default useLanguageStore;

