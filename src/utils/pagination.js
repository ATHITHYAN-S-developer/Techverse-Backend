export function getPaginationParams(req) {
  const page = Math.max(1, parseInt(req?.query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req?.query?.limit, 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function getPagination(queryOrReq = {}, defaultLimit = 20) {
  const query = queryOrReq.query ? queryOrReq.query : queryOrReq;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function formatPaginatedResponse(data, totalCount, page, limit) {
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export default getPagination;
