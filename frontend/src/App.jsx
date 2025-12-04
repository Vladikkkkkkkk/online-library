import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout';
import useAuthStore from './context/authStore';
import { Loader } from './components/common';


import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import BooksPage from './pages/books/BooksPage';
import BookDetail from './pages/books/BookDetail';
import CategoriesPage from './pages/categories';
import PlaylistsPage from './pages/playlists/PlaylistsPage';
import PlaylistDetail from './pages/playlists/PlaylistDetail';
import { Profile, Settings, MyLibrary } from './pages/user';
import { Dashboard, UsersManagement } from './pages/admin';
import NotFound from './pages/NotFound';

import './styles/index.css';
import { queryClient } from './config/queryClient';


const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuthStore();

  if (isLoading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated || !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
};


const GuestRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="books/:id" element={<BookDetail />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="categories/:id" element={<BooksPage />} />
          </Route>

          {}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />

          {}
          <Route path="/" element={<Layout />}>
            <Route
              path="library"
              element={
                <ProtectedRoute>
                  <MyLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="playlists"
              element={
                <ProtectedRoute>
                  <PlaylistsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="playlists/:id"
              element={
                <ProtectedRoute>
                  <PlaylistDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          {}
          <Route path="/" element={<Layout />}>
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <AdminRoute>
                  <UsersManagement />
                </AdminRoute>
              }
            />
          </Route>

          {}
          <Route path="*" element={<NotFound />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
