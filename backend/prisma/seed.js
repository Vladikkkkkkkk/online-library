const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.com' },
    update: {},
    create: {
      email: 'admin@library.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@library.com' },
    update: {},
    create: {
      email: 'user@library.com',
      password: userPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
    },
  });
  console.log('✅ Test user created:', user.email);

  // Create categories (for filtering/search purposes)
  const categories = [
    { name: 'Fiction', nameUk: 'Художня література', slug: 'fiction', description: 'Fictional works including novels and short stories' },
    { name: 'Science Fiction', nameUk: 'Наукова фантастика', slug: 'science-fiction', description: 'Science fiction and fantasy books' },
    { name: 'Mystery', nameUk: 'Детективи', slug: 'mystery', description: 'Mystery and thriller novels' },
    { name: 'Romance', nameUk: 'Романи', slug: 'romance', description: 'Romantic fiction' },
    { name: 'History', nameUk: 'Історія', slug: 'history', description: 'Historical books and biographies' },
    { name: 'Science', nameUk: 'Наука', slug: 'science', description: 'Scientific literature' },
    { name: 'Philosophy', nameUk: 'Філософія', slug: 'philosophy', description: 'Philosophical works' },
    { name: 'Psychology', nameUk: 'Психологія', slug: 'psychology', description: 'Psychology and self-help' },
    { name: 'Programming', nameUk: 'Програмування', slug: 'programming', description: 'Programming and technology books' },
    { name: 'Children', nameUk: 'Дитяча література', slug: 'children', description: 'Books for children' },
    { name: 'Poetry', nameUk: 'Поезія', slug: 'poetry', description: 'Poetry collections' },
    { name: 'Classic', nameUk: 'Класика', slug: 'classic', description: 'Classic literature' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  console.log('✅ Categories created:', categories.length);

  // Create sample saved books for test user (from Open Library)
  const sampleSavedBooks = [
    { openLibraryId: 'OL1168083W' }, // 1984
    { openLibraryId: 'OL66554W' },   // Pride and Prejudice
  ];

  for (const savedBook of sampleSavedBooks) {
    const existing = await prisma.savedBook.findFirst({
      where: {
        userId: user.id,
        openLibraryId: savedBook.openLibraryId,
      },
    });

    if (!existing) {
      await prisma.savedBook.create({
        data: {
          userId: user.id,
          openLibraryId: savedBook.openLibraryId,
        },
      });
    }
  }
  console.log('✅ Sample saved books created:', sampleSavedBooks.length);

  // Create sample playlists for test user
  const samplePlaylists = [
    {
      name: 'My Favorites',
      description: 'My favorite books',
      isPublic: false,
      books: ['OL1168083W'], // 1984
    },
    {
      name: 'Classic Literature',
      description: 'Classic books I want to read',
      isPublic: true,
      books: ['OL66554W'], // Pride and Prejudice
    },
  ];

  for (const playlistData of samplePlaylists) {
    const { books, ...playlistFields } = playlistData;
    const playlist = await prisma.playlist.create({
      data: {
        ...playlistFields,
        userId: user.id,
      },
    });

    // Add books to playlist
    for (let i = 0; i < books.length; i++) {
      await prisma.playlistBook.create({
        data: {
          playlistId: playlist.id,
          openLibraryId: books[i],
          order: i,
        },
      });
    }
  }
  console.log('✅ Sample playlists created:', samplePlaylists.length);

  console.log('🎉 Seed completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   Admin: admin@library.com / admin123');
  console.log('   User:  user@library.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
