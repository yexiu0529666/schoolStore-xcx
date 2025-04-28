const { productApi } = require('../../utils/api');

Page({
  data: {
    categories: [],
    currentCategory: {},
    currentSubCategory: 0,
    products: [],
    page: 1,
    limit: 10,
    isLoading: false,
    loadAll: false,
    scrollTop: 0
  },

  onLoad: function (options) {
    // 获取分类列表
    this.loadCategories();
    
    // 如果有指定分类ID，则切换到该分类
    if (options.id) {
      const categoryId = parseInt(options.id);
      this.setData({
        pendingCategoryId: categoryId
      });
    }
    
    // Check if we have parameters from tabBar navigation
    this.checkGlobalParams();
  },
  
  onShow: function () {
    // 页面显示时更新一次数据（可能是从其他页面返回）
    if (this.data.currentCategory.id) {
      this.refreshProducts();
    }
    
    // Check for params when page shows (for tabBar navigation)
    this.checkGlobalParams();
  },
  
  // Handle parameters passed from banner or other pages
  onParamsReceived: function(params) {
    console.log('Category received params:', params);
    if (params && params.id) {
      const categoryId = parseInt(params.id);
      // If categories are already loaded
      if (this.data.categories.length > 0) {
        const category = this.findCategory(this.data.categories, categoryId);
        if (category) {
          this.setData({
            currentCategory: category,
            currentSubCategory: 0,
            scrollTop: 0
          });
          this.refreshProducts();
        }
      } else {
        // Save for later when categories load
        this.setData({
          pendingCategoryId: categoryId
        });
      }
    }
  },
  
  // Check for parameters stored in global data
  checkGlobalParams: function() {
    const app = getApp();
    if (app.globalData && app.globalData.pageParams && app.globalData.pageParams.category) {
      const params = app.globalData.pageParams.category;
      // Clear the params to avoid processing them multiple times
      app.globalData.pageParams.category = null;
      // Handle the parameters
      this.onParamsReceived(params);
    }
  },
  
  onPullDownRefresh: function () {
    if (this.data.currentCategory.id) {
      this.refreshProducts().then(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      this.loadCategories().then(() => {
        wx.stopPullDownRefresh();
      });
    }
  },
  
  // 加载分类列表
  loadCategories: function () {
    return productApi.getCategories()
      .then(res => {
        if (res.success && res.data.length > 0) {
          this.setData({
            categories: res.data
          });
          
          // 处理待处理的分类ID或选择第一个分类
          const pendingId = this.data.pendingCategoryId;
          if (pendingId) {
            // 查找指定的分类
            const category = this.findCategory(res.data, pendingId);
            if (category) {
              this.setData({
                currentCategory: category,
                pendingCategoryId: null
              });
              this.loadProducts();
            } else {
              // 如果找不到指定分类，选择第一个分类
              this.setData({
                currentCategory: res.data[0],
                pendingCategoryId: null
              });
              this.loadProducts();
            }
          } else {
            // 默认选择第一个分类
            this.setData({
              currentCategory: res.data[0]
            });
            this.loadProducts();
          }
        }
      })
      .catch(err => {
        wx.showToast({
          title: err.message || '加载分类失败',
          icon: 'none'
        });
      });
  },
  
  // 递归查找分类
  findCategory: function (categories, id) {
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === id) {
        return categories[i];
      }
      
      if (categories[i].sub_categories && categories[i].sub_categories.length > 0) {
        const found = this.findCategory(categories[i].sub_categories, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  },
  
  // 切换分类
  switchCategory: function (e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.findCategory(this.data.categories, categoryId);
    
    if (category && category.id !== this.data.currentCategory.id) {
      this.setData({
        currentCategory: category,
        currentSubCategory: 0,
        scrollTop: 0
      });
      
      this.refreshProducts();
    }
  },
  
  // 切换子分类
  switchSubCategory: function (e) {
    const subCategoryId = e.currentTarget.dataset.id;
    
    if (subCategoryId !== this.data.currentSubCategory) {
      this.setData({
        currentSubCategory: subCategoryId,
        scrollTop: 0
      });
      
      this.refreshProducts();
    }
  },
  
  // 刷新商品列表（重置分页）
  refreshProducts: function () {
    this.setData({
      products: [],
      page: 1,
      loadAll: false
    });
    
    return this.loadProducts();
  },
  
  // 加载商品列表
  loadProducts: function () {
    if (this.data.isLoading || this.data.loadAll) {
      return Promise.resolve();
    }
    
    const categoryId = this.data.currentSubCategory || this.data.currentCategory.id;
    
    if (!categoryId) {
      return Promise.resolve();
    }
    
    this.setData({ isLoading: true });
    
    return productApi.getProducts({
      categoryId: categoryId,
      page: this.data.page,
      limit: this.data.limit
    })
      .then(res => {
        if (res.success) {
          const newProducts = [...this.data.products, ...res.data.list];
          
          this.setData({
            products: newProducts,
            loadAll: newProducts.length >= res.data.total,
            page: this.data.page + 1
          });
        }
      })
      .catch(err => {
        wx.showToast({
          title: err.message || '加载商品失败',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ isLoading: false });
      });
  },
  
  // 加载更多商品
  loadMoreProducts: function () {
    this.loadProducts();
  },
  
  // 跳转到商品详情
  goToProductDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${id}`
    });
  },
  
  // 跳转到搜索页
  goToSearch: function () {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  }
}); 