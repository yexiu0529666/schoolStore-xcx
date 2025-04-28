const { productApi } = require('../../utils/api');
const app = getApp();  // Get app instance to access API utilities

Page({
  data: {
    productId: null,
    product: null,
    reviews: [],
    totalReviews: 0,
    averageRating: 0,
    isLoading: false,
    hasMoreReviews: true,
    pageSize: 10,
    pageNum: 1,
    currentFilter: 'all' // all, good(4-5), medium(3), bad(1-2), hasImage
  },

  onLoad: function (options) {
    if (options.productId) {
      this.setData({
        productId: options.productId
      });
      
      this.loadProductInfo();
      this.loadReviews();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  onReachBottom: function () {
    if (this.data.hasMoreReviews && !this.data.isLoading) {
      this.loadMoreReviews();
    }
  },
  
  // 加载商品信息
  loadProductInfo: function() {
    productApi.getProductDetail(this.data.productId)
      .then(res => {
        if (res.success) {
          this.setData({
            product: res.data
          });
        }
      })
      .catch(err => {
        console.error('获取商品信息失败:', err);
      });
  },
  
  // 加载评价统计信息 - 现在从loadReviews和fetchReviews中统一获取
  loadReviewStats: function() {
    // 不再单独获取评价统计，统计信息会随评价列表一起返回
  },
  
  // 加载评价列表
  loadReviews: function() {
    this.setData({
      isLoading: true,
      pageNum: 1,
      reviews: []
    });
    
    this.fetchReviews();
  },
  
  // 加载更多评价
  loadMoreReviews: function() {
    if (!this.data.hasMoreReviews || this.data.isLoading) return;
    
    this.setData({
      pageNum: this.data.pageNum + 1,
      isLoading: true
    });
    
    this.fetchReviews(true);
  },
  
  // 获取评价数据
  fetchReviews: function(isLoadingMore = false) {
    this.setData({ isLoading: true });
    
    // 使用app的request方法调用后端API
    app.request({
      url: `/review/list/${this.data.productId}`,
      data: {
        page: this.data.pageNum,
        limit: this.data.pageSize,
        filter: this.data.currentFilter !== 'all' ? this.data.currentFilter : 'all'
      }
    })
    .then(res => {
      if (res.success) {
        const reviewData = res.data;
        const reviews = isLoadingMore 
          ? [...this.data.reviews, ...reviewData.list]
          : reviewData.list;
        
        this.setData({
          reviews: reviews,
          totalReviews: reviewData.total,
          averageRating: reviewData.avg_rating || 0,
          isLoading: false,
          hasMoreReviews: reviewData.list.length === this.data.pageSize
        });
      } else {
        wx.showToast({
          title: res.message || '加载评价失败',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    })
    .catch(err => {
      console.error('获取评价列表失败:', err);
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: '加载评价失败',
        icon: 'none'
      });
    });
  },
  
  // 切换筛选条件
  changeFilter: function(e) {
    const filter = e.currentTarget.dataset.filter;
    
    if (filter !== this.data.currentFilter) {
      this.setData({
        currentFilter: filter
      });
      
      this.loadReviews();
    }
  },
  
  // 预览图片
  previewImage: function(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    
    wx.previewImage({
      current: current,
      urls: urls
    });
  }
}); 