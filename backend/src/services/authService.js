const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');


class AuthService {

  async register(userData) {
    const { email, password, firstName, lastName } = userData;


    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw ApiError.conflict('User with this email already exists');
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);


    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });


    const token = generateToken(user.id);

    return { user, token };
  }


  async login(email, password) {

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }


    if (user.isBlocked) {
      throw ApiError.forbidden('Ваш акаунт заблоковано. Зверніться до адміністратора для отримання допомоги.');
    }


    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw ApiError.unauthorized('Invalid credentials');
    }


    const token = generateToken(user.id);


    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }


  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isBlocked: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }


  async updateProfile(userId, updateData) {
    const { firstName, lastName, avatar } = updateData;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        updatedAt: true,
      },
    });

    return user;
  }


  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }


    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);


    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}

module.exports = new AuthService();

