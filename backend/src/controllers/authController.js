const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');


const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});


const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  res.json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});


const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);

  res.json({
    success: true,
    data: user,
  });
});


const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, avatar } = req.body;

  const user = await authService.updateProfile(req.user.id, {
    firstName,
    lastName,
    avatar,
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});


const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user.id, currentPassword, newPassword);

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});


const logout = asyncHandler(async (req, res) => {


  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
};

