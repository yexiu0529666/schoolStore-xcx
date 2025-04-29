const { productApi, couponApi } = require('../../utils/api');

Page({
  data: {
    banners: [], // 轮播图数据
    categories: [], // 分类数据
    hotProducts: [], // 热门商品
    newProducts: [], // 新品上架
    promotions: [], // 促销活动
    coupons: [], // 优惠券
    isLoading: true,
    userInfo: null,
    recommendProducts: [], // 推荐商品
    searchValue: '' // 搜索值
  },

  onLoad: function() {
    this.loadHomeData();
  },
  
  onShow: function() {
    const app = getApp();
    this.setData({
      userInfo: app.globalData.userInfo
    });
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadHomeData();
  },
  
  // 加载首页数据
  loadHomeData: function() {
    this.setData({
      isLoading: true
    });
    
    // 获取轮播图数据
    this.getBanners();
    
    // 获取分类数据
    this.getCategories();
    
    // 获取热门商品
    this.getHotProducts();
    
    // 获取新品上架
    this.getNewProducts();
    
    // 获取推荐优惠券
    this.getRecommendCoupons();
    
    // 获取推荐商品
    this.getRecommendProducts();
  },
  
  // 获取轮播图数据
  getBanners: function() {
    // 这里模拟一些轮播图数据，实际项目中应该从后端获取
    const banners = [
      {
        id: 1,
        imageUrl: '/static/images/banner1.svg',
        linkUrl: '/pages/product-list/product-list?type=new'
      },
      {
        id: 2,
        imageUrl: '/static/images/banner2.svg',
        linkUrl: '/pages/category/category?id=2'
      },
      {
        id: 3,
        imageUrl: '/static/images/banner3.svg',
        linkUrl: '/pages/coupon-center/coupon-center'
      }
    ];
    
    this.setData({
      banners
    });
  },
  
  // 获取分类数据
  getCategories: function() {
    productApi.getCategories()
      .then(res => {
        this.setData({
          categories: res.data.slice(0, 8) // 只显示前8个分类
        });
      })
      .catch(err => {
        console.error('获取分类失败', err);
      });
  },
  
  // 获取热门商品
  getHotProducts: function() {
    productApi.getHotProducts(6)
      .then(res => {
        this.setData({
          hotProducts: res.data
        });
      })
      .catch(err => {
        console.error('获取热门商品失败', err);
      });
  },
  
  // 获取新品上架
  getNewProducts: function() {
    productApi.getProducts({ isNew: true, limit: 4 })
      .then(res => {
        this.setData({
          newProducts: res.data.list
        });
      })
      .catch(err => {
        console.error('获取新品上架失败', err);
      });
  },
  
  
  // 获取推荐优惠券
  getRecommendCoupons: function() {
    wx.showLoading({
      title: '加载中...'
    });
    
    couponApi.getCoupons('available')
      .then(res => {
        if (res.success) {
          // 格式化显示的数据，确保前端显示格式一致
          const coupons = (res.data.list || []).slice(0, 3).map(coupon => ({
            id: coupon.id,
            title: coupon.title || '优惠券',
            amount: coupon.amount || 0,
            threshold: coupon.min_spend || 0,
            expireDate: coupon.end_date || '长期有效'
          }));
          
          this.setData({
            coupons: coupons,
            isLoading: false
          });
        } else {
          console.error('获取优惠券失败:', res.message);
          this.setData({
            coupons: [],
            isLoading: false
          });
        }
        
        // 停止下拉刷新和加载提示
        wx.stopPullDownRefresh();
        wx.hideLoading();
      })
      .catch(err => {
        console.error('获取优惠券网络错误:', err);
        // 静默处理所有错误，包括401
        this.setData({
          coupons: [],
          isLoading: false
        });
        
        // 停止下拉刷新和加载提示
        wx.stopPullDownRefresh();
        wx.hideLoading();
      });
  },
  
  // 获取推荐商品
  getRecommendProducts: function() {
    productApi.getProducts({ isRecommend: true, limit: 10 })
      .then(res => {
        this.setData({
          recommendProducts: res.data.list
        });
      })
      .catch(err => {
        console.error('获取推荐商品失败', err);
        
      });
  },
  
  // 商品点击
  onProductTap: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${id}`
    });
  },
  
  // 分类点击
  onCategoryTap: function(e) {
    const id = e.currentTarget.dataset.id;
    if (id === 8) {
      // 全部分类
      wx.switchTab({
        url: '/pages/category/category'
      });
    } else {
      // Since product-list page doesn't exist, navigate to category page with id
      const app = getApp();
      if (!app.globalData.pageParams) {
        app.globalData.pageParams = {};
      }
      
      // Store the category id in global data
      app.globalData.pageParams.category = { id: id };
      
      wx.switchTab({
        url: '/pages/category/category',
        success: function() {
          // Try to notify the category page to handle the parameter
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          
          if (currentPage && currentPage.route === 'pages/category/category') {
            if (typeof currentPage.onParamsReceived === 'function') {
              currentPage.onParamsReceived({ id: id });
            }
          }
        }
      });
    }
  },
  
  // 轮播图点击
  onBannerTap: function(e) {
    const url = e.currentTarget.dataset.url;
    console.log('Banner tapped, navigating to:', url);
    
    try {
      // Parse the URL to separate the path and query parameters
      let path = url;
      let query = {};
      
      if (url.includes('?')) {
        const urlParts = url.split('?');
        path = urlParts[0];
        
        // Parse query parameters
        const queryString = urlParts[1];
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          query[key] = value;
        });
      }
      
      // Check if the URL is for a tabBar page
      if (path === '/pages/category/category' || 
          path === '/pages/index/index' || 
          path === '/pages/cart/cart' || 
          path === '/pages/user/user') {
        
        // First switch to the tab, then handle any parameters
        wx.switchTab({
          url: path,
          success: function() {
            // Store parameters in global data to be used by the target page
            const app = getApp();
            if (!app.globalData.pageParams) {
              app.globalData.pageParams = {};
            }
            
            const pageName = path.split('/').pop();
            app.globalData.pageParams[pageName] = query;
            
            console.log('Stored parameters for', pageName, ':', query);
            
            // If we're navigating to the current page and need to refresh it
            const pages = getCurrentPages();
            const currentPage = pages[pages.length - 1];
            
            if (currentPage && currentPage.route === path.substr(1)) {
              // Check if the page has an onParamsReceived method
              if (typeof currentPage.onParamsReceived === 'function') {
                currentPage.onParamsReceived(query);
              }
            }
          },
          fail: function(res) {
            console.error('SwitchTab failed:', res);
            wx.showToast({
              title: '页面跳转失败',
              icon: 'none'
            });
          }
        });
      } else {
        wx.navigateTo({
          url: url,
          fail: function(res) {
            console.error('NavigateTo failed:', res);
            wx.showToast({
              title: '页面跳转失败',
              icon: 'none'
            });
          }
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      wx.showToast({
        title: '页面跳转失败',
        icon: 'none'
      });
    }
  },
  
  // 优惠券点击
  onCouponTap: function(e) {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再领取优惠券',
        confirmText: '去登录',
        success(res) {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    const id = e.currentTarget.dataset.id;
    wx.showLoading({
      title: '领取中...'
    });
    
    couponApi.receiveCoupon(id)
      .then(res => {
        wx.hideLoading();
        if (res.success) {
          wx.showToast({
            title: '领取成功',
            icon: 'success'
          });
          
          // 刷新优惠券数据
          this.getRecommendCoupons();
        } else {
          wx.showToast({
            title: res.message || '领取失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('领取优惠券失败:', err);
        wx.showToast({
          title: err.message || '领取失败，请稍后再试',
          icon: 'none'
        });
      });
  },
  
  // 促销活动点击
  onPromotionTap: function(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({
      url
    });
  },
  
  // 更多热门点击
  onMoreHotTap: function() {
    wx.navigateTo({
      url: '/pages/product-list/product-list?type=hot'
    });
  },
  
  // 更多新品点击
  onMoreNewTap: function() {
    wx.navigateTo({
      url: '/pages/product-list/product-list?type=new'
    });
  },
  
  // 更多优惠券点击
  onMoreCouponTap: function() {
    wx.navigateTo({
      url: '/pages/coupon-center/coupon-center'
    });
  },
  
  // 输入搜索内容
  onSearchInput: function(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },
  
  // 执行搜索
  onSearch: function() {
    const keyword = this.data.searchValue.trim();
    if (!keyword) {
      return;
    }
    
    wx.navigateTo({
      url: `/pages/product-list/product-list?keyword=${keyword}`
    });
  },
  
  // 分享
  onShareAppMessage: function() {
    return {
      title: '校园迷你商城 - 一站式校园购物平台',
      path: '/pages/index/index'
    };
  }
}) 