
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       
    .replace(/[^\w\-]+/g, '')   
    .replace(/\-\-+/g, '-')     
    .replace(/^-+/, '')         
    .replace(/-+$/, '');        
};


const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  return {
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
  };
};


const paginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};


const cleanObject = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

module.exports = {
  generateSlug,
  paginate,
  paginationResponse,
  cleanObject,
};

