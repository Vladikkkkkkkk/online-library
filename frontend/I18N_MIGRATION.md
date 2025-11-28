# Міграція на i18next

Проєкт мігровано на i18next для кращої підтримки багатомовності.

## Що зроблено:

1. ✅ Встановлено i18next та react-i18next
2. ✅ Створено конфігурацію i18next (`src/i18n/config.js`)
3. ✅ Створено файли перекладів (`src/i18n/locales/uk.json`, `en.json`)
4. ✅ Оновлено ключові компоненти:
   - Header
   - Home
   - BooksPage
   - BookDetail
   - BookReader

## Як оновити інші компоненти:

### 1. Замінити імпорт:
```javascript
// Було:
import useLanguageStore from '../../context/languageStore';
const { t } = useLanguageStore();

// Стало:
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
```

### 2. Використовувати переклади:
```javascript
// Було:
t('nav.home')

// Стало (те саме, але тепер працює правильно):
t('nav.home')
```

### 3. Зміна мови:
```javascript
// Було:
const { toggleLanguage } = useLanguageStore();

// Стало:
const { i18n } = useTranslation();
const toggleLanguage = () => {
  i18n.changeLanguage(i18n.language === 'uk' ? 'en' : 'uk');
};
```

## Компоненти, які потрібно оновити:

- [ ] `src/pages/user/MyLibrary.jsx`
- [ ] `src/pages/user/Profile.jsx`
- [ ] `src/pages/user/Settings.jsx`
- [ ] `src/pages/auth/Login.jsx`
- [ ] `src/pages/auth/Register.jsx`
- [ ] `src/pages/admin/Dashboard.jsx`
- [ ] `src/pages/admin/BooksManagement.jsx`
- [ ] `src/pages/admin/UsersManagement.jsx`
- [ ] `src/pages/admin/BookForm.jsx`
- [ ] `src/pages/admin/ImportBooks.jsx`
- [ ] `src/pages/NotFound.jsx`

## Переваги i18next:

1. ✅ Автоматичне визначення мови браузера
2. ✅ Збереження вибору мови в localStorage
3. ✅ Підтримка плюралізації
4. ✅ Інтерполяція змінних
5. ✅ Краща інтеграція з React
6. ✅ Можливість lazy loading перекладів

## Видалення старого коду:

Після оновлення всіх компонентів можна видалити:
- `src/context/languageStore.js`

