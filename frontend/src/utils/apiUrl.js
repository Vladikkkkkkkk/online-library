
export const getBaseApiUrl = () => {

  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  return envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
};


export const getApiUrl = () => {
  return `${getBaseApiUrl()}/api`;
};

