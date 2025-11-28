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

  // Create categories
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

  // Create sample authors
  const authors = [
    { name: 'Taras Shevchenko', biography: 'Ukrainian poet, writer, artist', birthYear: 1814, deathYear: 1861 },
    { name: 'Ivan Franko', biography: 'Ukrainian poet, writer, scholar', birthYear: 1856, deathYear: 1916 },
    { name: 'Lesya Ukrainka', biography: 'Ukrainian poet, writer, playwright', birthYear: 1871, deathYear: 1913 },
    { name: 'George Orwell', biography: 'English novelist and essayist', birthYear: 1903, deathYear: 1950 },
    { name: 'Jane Austen', biography: 'English novelist', birthYear: 1775, deathYear: 1817 },
  ];

  const createdAuthors = [];
  for (const author of authors) {
    const created = await prisma.author.upsert({
      where: { id: author.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: author,
    });
    createdAuthors.push(created);
  }
  console.log('✅ Authors created:', authors.length);

  // Create sample books
  const fictionCategory = await prisma.category.findUnique({ where: { slug: 'fiction' } });
  const classicCategory = await prisma.category.findUnique({ where: { slug: 'classic' } });
  const poetryCategory = await prisma.category.findUnique({ where: { slug: 'poetry' } });

  const sampleBooks = [
    {
      title: 'Kobzar',
      description: 'A collection of poems by Taras Shevchenko, the greatest Ukrainian poet.',
      publishYear: 1840,
      language: 'uk',
      coverUrl: 'https://covers.openlibrary.org/b/id/8234428-L.jpg',
      authorIndex: 0,
      categories: [poetryCategory?.id, classicCategory?.id].filter(Boolean),
    },
    {
      title: '1984',
      description: 'A dystopian social science fiction novel and cautionary tale by George Orwell.',
      publishYear: 1949,
      language: 'en',
      isbn: '9780451524935',
      coverUrl: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
      openLibraryId: 'OL1168083W',
      authorIndex: 3,
      categories: [fictionCategory?.id, classicCategory?.id].filter(Boolean),
    },
    {
      title: 'Pride and Prejudice',
      description: 'A romantic novel following the character development of Elizabeth Bennet.',
      publishYear: 1813,
      language: 'en',
      isbn: '9780141439518',
      coverUrl: 'https://covers.openlibrary.org/b/id/8234234-L.jpg',
      openLibraryId: 'OL66554W',
      authorIndex: 4,
      categories: [fictionCategory?.id, classicCategory?.id].filter(Boolean),
    },
  ];

  for (const bookData of sampleBooks) {
    const { authorIndex, categories, ...bookFields } = bookData;
    
    const existingBook = bookFields.isbn 
      ? await prisma.book.findUnique({ where: { isbn: bookFields.isbn } })
      : await prisma.book.findFirst({ where: { title: bookFields.title } });

    if (!existingBook) {
      await prisma.book.create({
        data: {
          ...bookFields,
          authors: {
            create: {
              author: { connect: { id: createdAuthors[authorIndex].id } },
            },
          },
          categories: {
            create: categories.map((categoryId) => ({
              category: { connect: { id: categoryId } },
            })),
          },
        },
      });
    }
  }
  console.log('✅ Sample books created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

