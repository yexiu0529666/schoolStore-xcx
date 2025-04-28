/**
 * 校园迷你商城 API 接口模块
 */

const app = getApp();

/**
 * 用户模块 API
 */
const userApi = {
  // 用户登录
  login: (data) => {
    return app.request({
      url: '/user/login',
      method: 'POST',
      data
    });
  },
  
  // 管理员登录
  adminLogin: (data) => {
    return app.request({
      url: '/admin/login',
      method: 'POST',
      data
    });
  },
  
  // 用户注册
  register: (data) => {
    return app.request({
      url: '/user/register',
      method: 'POST',
      data
    });
  },
  
  // 获取用户信息
  getUserInfo: () => {
    return app.request({
      url: '/user/info'
    });
  },
  
  // 修改用户信息
  updateUserInfo: (data) => {
    return app.request({
      url: '/user/update',
      method: 'POST',
      data
    });
  },
  
  // 微信登录
  wxLogin: (code) => {
    return app.request({
      url: '/user/wx-login',
      method: 'POST',
      data: { code }
    });
  },
  
  // 发送验证码
  sendVerifyCode: (data) => {
    return app.request({
      url: '/user/send-verify-code',
      method: 'POST',
      data
    });
  },
  
  // 获取地址列表
  getAddresses: () => {
    return app.request({
      url: '/user/address/list'
    });
  },
  
  // 添加新地址
  addAddress: (data) => {
    return app.request({
      url: '/user/address/add',
      method: 'POST',
      data
    });
  },
  
  // 更新地址
  updateAddress: (data) => {
    return app.request({
      url: '/user/address/update',
      method: 'POST',
      data
    });
  },
  
  // 删除地址
  deleteAddress: (id) => {
    return app.request({
      url: '/user/address/delete',
      method: 'POST',
      data: { id }
    });
  },
  
  // 设置默认地址
  setDefaultAddress: (id) => {
    return app.request({
      url: '/user/address/set-default',
      method: 'POST',
      data: { id }
    });
  },
  
  // 获取地址详情
  getAddressDetail: (id) => {
    return app.request({
      url: `/user/address/detail/${id}`
    });
  },
  
  // 获取收藏列表
  getFavorites: () => {
    return app.request({
      url: '/user/favorite/list'
    });
  },
  
  // 添加收藏
  addFavorite: (productId) => {
    return app.request({
      url: '/user/favorite/add',
      method: 'POST',
      data: { product_id: productId }
    });
  },
  
  // 取消收藏
  removeFavorite: (favoriteId) => {
    return app.request({
      url: '/user/favorite/remove',
      method: 'POST',
      data: { id: favoriteId }
    });
  },
  
  // 检查商品是否已收藏
  checkFavorite: (productId) => {
    return app.request({
      url: '/user/favorite/check',
      data: { product_id: productId }
    });
  }
};

/**
 * 地址模块 API
 */
const addressApi = {
  // 获取地址列表
  getAddressList: () => {
    return app.request({
      url: '/user/address/list'
    });
  },
  
  // 添加新地址
  addAddress: (data) => {
    return app.request({
      url: '/user/address/add',
      method: 'POST',
      data
    });
  },
  
  // 更新地址
  updateAddress: (data) => {
    return app.request({
      url: '/user/address/update',
      method: 'POST',
      data
    });
  },
  
  // 删除地址
  deleteAddress: (id) => {
    return app.request({
      url: '/user/address/delete',
      method: 'POST',
      data: { id }
    });
  },
  
  // 设置默认地址
  setDefaultAddress: (id) => {
    return app.request({
      url: '/user/address/set-default',
      method: 'POST',
      data: { id }
    });
  },
  
  // 获取地址详情
  getAddressDetail: (id) => {
    return app.request({
      url: `/user/address/detail/${id}`
    });
  }
};

/**
 * 商品模块 API
 */
const productApi = {
  // 获取商品列表
  getProducts: (params) => {
    return app.request({
      url: '/product/list',
      data: params
    });
  },
  
  // 获取商品详情
  getProductDetail: (id) => {
    return app.request({
      url: `/product/detail/${id}`
    });
  },
  
  // 获取商品分类
  getCategories: () => {
    return app.request({
      url: '/product/categories'
    });
  },
  
  // 获取热门商品
  getHotProducts: (limit = 10) => {
    return app.request({
      url: '/product/hot',
      data: { limit }
    });
  },
  
  // 搜索商品
  searchProducts: (keyword, page = 1, limit = 10) => {
    return app.request({
      url: '/product/search',
      data: { keyword, page, limit }
    });
  }
};

/**
 * 购物车模块 API
 */
const cartApi = {
  // 获取购物车列表
  getCartList: () => {
    return app.request({
      url: '/cart/list'
    });
  },
  
  // 添加商品到购物车
  addToCart: (data) => {
    return app.request({
      url: '/cart/add',
      method: 'POST',
      data
    });
  },
  
  // 更新购物车商品数量
  updateCartItem: (data) => {
    return app.request({
      url: '/cart/update',
      method: 'POST',
      data
    });
  },
  
  // 删除购物车商品
  removeCartItem: (id) => {
    return app.request({
      url: '/cart/remove',
      method: 'POST',
      data: { id }
    });
  },
  
  // 清空购物车
  clearCart: () => {
    return app.request({
      url: '/cart/clear',
      method: 'POST'
    });
  },
  
  // 获取结算商品列表
  getCheckoutItems: (cart_item_ids) => {
    return app.request({
      url: '/cart/checkout_items',
      method: 'POST',
      data: { cart_item_ids }
    });
  }
};

/**
 * 订单模块 API
 */
const orderApi = {
  // 创建订单
  createOrder: (data) => {
    return app.request({
      url: '/order/create',
      method: 'POST',
      data
    });
  },
  
  // 直接购买创建订单
  createDirectOrder: (data) => {
    return app.request({
      url: '/order/create/direct',
      method: 'POST',
      data
    });
  },
  
  // 获取订单列表
  getOrderList: (status = '', page = 1, limit = 10) => {
    // 处理状态数组，将其转换为逗号分隔的字符串
    const statusParam = Array.isArray(status) ? status.join(',') : status;
    
    return app.request({
      url: '/order/list',
      data: { status: statusParam, page, limit }
    });
  },
  
  // 获取订单详情
  getOrderDetail: (id) => {
    return app.request({
      url: `/order/detail/${id}`
    });
  },
  
  // 取消订单
  cancelOrder: (id) => {
    return app.request({
      url: `/order/cancel/${id}`,
      method: 'POST'
    });
  },
  
  // 支付订单
  payOrder: (id) => {
    return app.request({
      url: `/order/pay/${id}`,
      method: 'POST'
    });
  },
  
  // 确认收货
  confirmOrder: (id) => {
    return app.request({
      url: `/order/confirm/${id}`,
      method: 'POST'
    });
  },
  
  // 评价订单
  rateOrder: (data) => {
    return app.request({
      url: '/order/rate',
      method: 'POST',
      data
    });
  },
  
  // 申请退款
  applyRefund: (orderId, refundReason) => {
    return app.request({
      url: `/order/refund/apply/${orderId}`,
      method: 'POST',
      data: { refund_reason: refundReason }
    });
  },
  
  // 商家确认退款 (仅商家用户可用)
  confirmRefund: (orderId, action, remark) => {
    return app.request({
      url: `/order/refund/confirm/${orderId}`,
      method: 'POST',
      data: { 
        action: action, // 'confirm' 或 'reject'
        remark: remark 
      }
    });
  }
};

/**
 * 优惠券模块 API
 */
const couponApi = {
  // 获取可用优惠券列表
  getCoupons: (status) => {
    if (status) {
      return app.request({
        url: '/coupon/list',
        data: { status }
      });
    } else {
      return app.request({
        url: '/coupon/list'
      });
    }
  },
  
  // 获取用户优惠券
  getUserCoupons: (status = '') => {
    return app.request({
      url: '/coupon/user',
      data: { status }
    });
  },
  
  // 领取优惠券
  receiveCoupon: (id) => {
    return app.request({
      url: '/coupon/receive',
      method: 'POST',
      data: { id }
    });
  },
  
  // 检查优惠券可用性
  checkCoupon: (id, total) => {
    return app.request({
      url: '/coupon/check',
      data: { id, total }
    });
  },
  
  // 分享优惠券
  shareCoupon: (coupon_id) => {
    return app.request({
      url: '/coupon/share',
      method: 'POST',
      data: { coupon_id }
    });
  },
  
  // 领取分享的优惠券
  receiveSharedCoupon: (coupon_id, share_user_id) => {
    return app.request({
      url: '/coupon/receive-shared',
      method: 'POST',
      data: { coupon_id, share_user_id }
    });
  }
};

/**
 * 商家模块 API
 */
const merchantApi = {
  // 获取商家信息
  getMerchantInfo: () => {
    return app.request({
      url: '/merchant/info'
    });
  },
  
  // 获取商家商品列表
  getMerchantProducts: (params = {}) => {
    return app.request({
      url: '/merchant/product/list',
      data: params
    });
  },
  
  // 商家添加商品
  addProduct: (data) => {
    return app.request({
      url: '/merchant/product/add',
      method: 'POST',
      data
    });
  },
  
  // 商家修改商品
  updateProduct: (productId, data) => {
    // 确保ID包含在数据中
    const productData = {
      ...data,
      id: productId
    };
    
    console.log('更新商品 API 调用:', {
      productId: productId,
      data: data,
      productData: productData
    });
    
    return app.request({
      url: '/merchant/product/update',
      method: 'POST',
      data: productData,
      header: {
        'Content-Type': 'application/json'
      }
    });
  },
  
  // 商家删除商品
  removeProduct: (id) => {
    return app.request({
      url: '/merchant/product/remove',
      method: 'POST',
      data: { id }
    });
  },
  
  // 商家添加分类
  addCategory: (data) => {
    return app.request({
      url: '/merchant/category/add',
      method: 'POST',
      data
    });
  },
  
  // 商家修改分类
  updateCategory: (data) => {
    return app.request({
      url: '/merchant/category/update',
      method: 'POST',
      data
    });
  },
  
  // 商家删除分类
  deleteCategory: (id) => {
    return app.request({
      url: '/merchant/category/delete',
      method: 'POST',
      data: { id }
    });
  },
  
  // 商家获取订单列表
  getMerchantOrders: (status = '', page = 1, limit = 10) => {
    // 处理状态数组，将其转换为逗号分隔的字符串
    const statusParam = Array.isArray(status) ? status.join(',') : status;
    
    return app.request({
      url: '/merchant/order/list',
      data: { status: statusParam, page, limit }
    });
  },
  
  // 商家获取订单详情
  getMerchantOrderDetail: (orderId) => {
    return app.request({
      url: `/merchant/order/detail/${orderId}`
    });
  },
  
  // 商家处理订单
  processOrder: (orderId, status, data = {}) => {
    return app.request({
      url: '/merchant/order/process',
      method: 'POST',
      data: {
        order_id: orderId,
        status,
        ...data
      }
    });
  },
  
  // 商家处理退款申请
  processRefund: (orderId, action, remark = '') => {
    return app.request({
      url: `/order/refund/confirm/${orderId}`,
      method: 'POST',
      data: {
        action: action, // confirm 或 reject
        remark: remark
      }
    });
  },
  
  // 商家创建优惠券
  createCoupon: (data) => {
    return app.request({
      url: '/merchant/coupon/create',
      method: 'POST',
      data
    });
  },
  
  // 商家修改优惠券
  updateCoupon: (data) => {
    return app.request({
      url: '/merchant/coupon/update',
      method: 'POST',
      data
    });
  },
  
  // 商家删除优惠券
  removeCoupon: (id) => {
    return app.request({
      url: '/merchant/coupon/remove',
      method: 'POST',
      data: { id }
    });
  },
  
  // 商家优惠券列表
  getMerchantCoupons: () => {
    return app.request({
      url: '/merchant/coupon/list'
    });
  },
  
  // 商家统计数据
  getMerchantStats: (period = 'week') => {
    return app.request({
      url: '/merchant/stats',
      data: { period }
    });
  }
};

/**
 * 评论模块 API
 */
const reviewApi = {
  // 提交商品评价
  submitReview: (data) => {
    return app.request({
      url: '/review/submit',
      method: 'POST',
      data
    });
  },
  
  // 获取商品评价列表
  getProductReviews: (productId, page = 1, limit = 10, filter = 'all') => {
    const params = { page, limit };
    if (filter !== 'all') {
      params.filter = filter;
    }
    
    return app.request({
      url: `/review/list/${productId}`,
      data: params
    });
  },
  
  // 获取我的评价列表
  getMyReviews: (page = 1, limit = 10) => {
    return app.request({
      url: '/review/my',
      data: { page, limit }
    });
  },
  
  // 删除评价
  deleteReview: (reviewId) => {
    return app.request({
      url: `/review/delete/${reviewId}`,
      method: 'POST'
    });
  }
};

// 导出所有 API 接口
module.exports = {
  userApi,
  productApi,
  cartApi,
  orderApi,
  addressApi,
  couponApi,
  merchantApi,
  reviewApi
}; 