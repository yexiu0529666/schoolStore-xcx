const { productApi, cartApi, userApi, reviewApi } = require('../../utils/api');

Page({
  data: {
    productId: null,
    product: {},
    isLoading: true,
    isSpecsPopupVisible: false,
    selectedSpec: null,
    quantity: 1,
    cartCount: 0,
    currentAction: 'addToCart', // 'addToCart' or 'buyNow'
    isFavorite: false,
    favoriteId: null,
    // 添加评价相关数据
    reviews: [],
    reviewsCount: 0,
    hasMoreReviews: false
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({
        productId: options.id
      });
      this.loadProductDetail();
      this.checkFavorite();
      this.loadProductReviews(); // 加载商品评价
    } else {
      wx.showToast({
        title: '商品参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  onShow: function () {
    // 获取购物车数量
    this.getCartCount();
  },
  
  onShareAppMessage: function () {
    const product = this.data.product;
    return {
      title: product.name,
      path: `/pages/product/product?id=${this.data.productId}`,
      imageUrl: product.main_image
    };
  },
  
  // 加载商品详情
  loadProductDetail: function () {
    this.setData({ isLoading: true });
    
    return productApi.getProductDetail(this.data.productId)
      .then(res => {
        if (res.success) {
          this.setData({
            product: res.data,
            isLoading: false
          });
          
          // 如果只有一个规格，默认选中
          if (res.data.specs && res.data.specs.length === 1) {
            this.selectSpec({ currentTarget: { dataset: { id: res.data.specs[0].id } } });
          }
        }
      })
      .catch(err => {
        this.setData({ isLoading: false });
        wx.showToast({
          title: err.message || '加载商品失败',
          icon: 'none'
        });
      });
  },
  
  // 获取购物车数量
  getCartCount: function () {
    cartApi.getCartList()
      .then(res => {
        if (res.success && res.data && res.data.list) {
          let count = 0;
          res.data.list.forEach(item => {
            count += item.quantity;
          });
          
          this.setData({ cartCount: count });
        }
      })
      .catch(err => {
        console.error('获取购物车数量失败:', err);
      });
  },
  
  // 预览图片
  previewImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.product.images && this.data.product.images.length > 0 
      ? this.data.product.images 
      : [this.data.product.main_image];
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },
  
  // 打开规格选择弹窗
  openSpecsPopup: function (e) {
    const action = e.currentTarget.dataset.action || 'addToCart';
    
    this.setData({
      isSpecsPopupVisible: true,
      currentAction: action
    });
  },
  
  // 关闭规格选择弹窗
  closeSpecsPopup: function () {
    this.setData({
      isSpecsPopupVisible: false
    });
  },
  
  // 选择规格
  selectSpec: function (e) {
    const specId = e.currentTarget.dataset.id;
    const specs = this.data.product.specs;
    
    if (specs && specs.length > 0) {
      const spec = specs.find(item => item.id === specId);
      
      if (spec && spec.stock > 0) {
        this.setData({
          selectedSpec: spec,
          quantity: 1
        });
      }
    }
  },
  
  // 减少数量
  decreaseQuantity: function () {
    console.log('减少数量');
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      });
    }
  },
  
  // 增加数量
  increaseQuantity: function () {
    console.log('增加数量');
    const maxStock = this.data.selectedSpec 
      ? this.data.selectedSpec.stock 
      : this.data.product.stock;
    
    if (this.data.quantity < maxStock) {
      this.setData({
        quantity: this.data.quantity + 1
      });
    }
  },
  
  // 输入数量
  inputQuantity: function (e) {
    let value = parseInt(e.detail.value);
    const maxStock = this.data.selectedSpec 
      ? this.data.selectedSpec.stock 
      : this.data.product.stock;
    
    if (isNaN(value) || value < 1) {
      value = 1;
    } else if (value > maxStock) {
      value = maxStock;
    }
    
    this.setData({
      quantity: value
    });
  },
  
  // 添加到购物车
  addToCart: function () {
    const product = this.data.product;
    const selectedSpec = this.data.selectedSpec;
    
    // 如果有规格但未选择
    if (product.specs && product.specs.length > 0 && !selectedSpec) {
      return wx.showToast({
        title: '请选择规格',
        icon: 'none'
      });
    }
    
    const cartItem = {
      product_id: product.id,
      quantity: this.data.quantity
    };
    
    if (selectedSpec) {
      cartItem.spec_id = selectedSpec.id;
    }
    
    wx.showLoading({ title: '加入中' });
    
    cartApi.addToCart(cartItem)
      .then(res => {
        if (res.success) {
          wx.showToast({
            title: '已加入购物车',
            icon: 'success'
          });
          
          this.getCartCount();
          this.closeSpecsPopup();
        }
      })
      .catch(err => {
        wx.showToast({
          title: err.message || '加入购物车失败',
          icon: 'none'
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },
  
  // 立即购买
  buyNow: function () {
    const product = this.data.product;
    const selectedSpec = this.data.selectedSpec;
    
    // 如果有规格但未选择
    if (product.specs && product.specs.length > 0 && !selectedSpec) {
      return wx.showToast({
        title: '请选择规格',
        icon: 'none'
      });
    }
    
    // 关闭弹窗
    this.closeSpecsPopup();

    // 准备订单信息
    const productInfo = {
      product_id: product.id,
      product_name: product.name,
      product_image: product.main_image,
      price: selectedSpec ? selectedSpec.price : product.price,
      quantity: this.data.quantity,
      spec_id: selectedSpec ? selectedSpec.id : null,
      spec_name: selectedSpec ? selectedSpec.name : null,
      spec_value: selectedSpec ? selectedSpec.value : null,
      category_id: product.category_id || null,
      category_name: product.category ? product.category.name : null
    };
    
    console.log('立即购买商品信息:', productInfo);
    
    // 将商品信息转为字符串并编码
    const productInfoStr = encodeURIComponent(JSON.stringify(productInfo));
    
    // 直接跳转到订单确认页面，带上商品信息
    wx.navigateTo({
      url: `/pages/checkout/checkout?is_buy_now=true&product_info=${productInfoStr}`
    });
  },
  
  // 跳转到首页
  goToHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },
  
  // 跳转到购物车
  goToCart: function () {
    wx.switchTab({
      url: '/pages/cart/cart'
    });
  },
  
  // 检查商品是否已收藏
  checkFavorite: function() {
    const token = wx.getStorageSync('token');
    if (!token) return; // 未登录不检查收藏状态
    
    userApi.checkFavorite(this.data.productId)
      .then(res => {
        if (res.success) {
          this.setData({
            isFavorite: res.data.is_favorite,
            favoriteId: res.data.favorite_id
          });
        }
      })
      .catch(err => {
        console.error('检查收藏状态失败:', err);
      });
  },
  
  // 切换收藏状态
  toggleFavorite: function() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.isFavorite) {
      // 取消收藏
      userApi.removeFavorite(this.data.favoriteId)
        .then(res => {
          if (res.success) {
            this.setData({
              isFavorite: false,
              favoriteId: null
            });
            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: res.message || '操作失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
          console.error('取消收藏失败:', err);
        });
    } else {
      // 添加收藏
      userApi.addFavorite(this.data.productId)
        .then(res => {
          if (res.success) {
            this.setData({
              isFavorite: true,
              favoriteId: res.data.id
            });
            wx.showToast({
              title: '收藏成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: res.message || '操作失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
          console.error('添加收藏失败:', err);
        });
    }
  },
  
  // 加载商品评价
  loadProductReviews: function() {
    if (!this.data.productId) return;
    
    reviewApi.getProductReviews(this.data.productId, 1, 3)
      .then(res => {
        if (res.success) {
          this.setData({
            reviews: res.data.list,
            reviewsCount: res.data.total,
            hasMoreReviews: res.data.list.length >= 3 && res.data.total > 3
          });
        }
      })
      .catch(err => {
        console.error('获取商品评价失败:', err);
      });
  },
  
  // 查看更多评价
  viewMoreReviews: function() {
    wx.navigateTo({
      url: `/pages/reviews/reviews?productId=${this.data.productId}`
    });
  },
  
  // 预览评价图片
  previewReviewImage: function(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    
    wx.previewImage({
      current: current,
      urls: urls
    });
  },
}); 