const app = getApp();
const { reviewApi, orderApi } = require('../../utils/api');

Page({
  data: {
    orderItemId: null,
    orderId: null,
    productId: null,
    loading: true,
    orderItem: null,
    rating: 5,
    content: '',
    images: [],
    isAnonymous: false,
    submitting: false
  },

  onLoad: function (options) {
    const app = getApp();
    let orderItemId = options.orderItemId;
    let orderId = options.orderId;
    
    // If options don't have the required params, check global app params
    if (!orderItemId && app.globalData.pageParams) {
      orderItemId = app.globalData.pageParams.orderItemId;
      orderId = app.globalData.pageParams.orderId;
      
      // Clear params after use
      app.globalData.pageParams = {};
    }
    
    if (orderItemId) {
      this.setData({
        orderItemId: parseInt(orderItemId),
        orderId: orderId ? parseInt(orderId) : null
      });
      this.loadOrderItemDetails();
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

  // 加载订单项详情
  loadOrderItemDetails: function () {
    const that = this;
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/order/detail/${that.data.orderId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: function (res) {
        if (res.data && res.data.success) {
          const order = res.data.data;
          const orderItem = order.items.find(item => item.id === that.data.orderItemId);
          
          if (orderItem) {
            that.setData({
              orderItem: orderItem,
              productId: orderItem.product_id,
              loading: false
            });
          } else {
            wx.showToast({
              title: '商品信息不存在',
              icon: 'none'
            });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }
        } else {
          wx.showToast({
            title: res.data?.message || '获取订单详情失败',
            icon: 'none'
          });
        }
      },
      fail: function (err) {
        console.error('获取订单详情失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: function () {
        that.setData({ loading: false });
      }
    });
  },

  // 设置评分
  setRating: function (e) {
    const rating = parseInt(e.currentTarget.dataset.rating);
    this.setData({ rating });
  },

  // 输入评价内容
  inputContent: function (e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 切换匿名状态
  toggleAnonymous: function () {
    this.setData({
      isAnonymous: !this.data.isAnonymous
    });
  },

  // 选择图片
  chooseImage: function () {
    const that = this;
    if (that.data.images.length >= 3) {
      wx.showToast({
        title: '最多上传3张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count: 3 - that.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        // 上传图片到服务器
        that.uploadImages(res.tempFilePaths);
      }
    });
  },
  
  // 上传图片
  uploadImages: function (tempFilePaths) {
    const that = this;
    let uploaded = 0;
    let newImages = [...that.data.images];
    
    wx.showLoading({
      title: '上传中...',
    });
    
    tempFilePaths.forEach(path => {
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/api/upload/`, 
        filePath: path,
        name: 'file',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: function (res) {
          const data = JSON.parse(res.data);
          if (data.success) {
            newImages.push(data.data.url);
          } else {
            wx.showToast({
              title: '图片上传失败',
              icon: 'none'
            });
          }
        },
        complete: function () {
          uploaded++;
          if (uploaded === tempFilePaths.length) {
            wx.hideLoading();
            that.setData({
              images: newImages
            });
          }
        }
      });
    });
  },
  
  // 删除图片
  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index;
    let images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },
  
  // 提交评价
  submitReview: function () {
    const that = this;
    
    if (that.data.submitting) return;
    
    if (!that.data.content.trim()) {
      wx.showToast({
        title: '请输入评价内容',
        icon: 'none'
      });
      return;
    }
    
    that.setData({ submitting: true });
    
    reviewApi.submitReview({
      order_item_id: that.data.orderItemId,
      rating: that.data.rating,
      content: that.data.content,
      images: that.data.images,
      is_anonymous: that.data.isAnonymous
    }).then(res => {
      if (res.success) {
        wx.showToast({
          title: '评价成功',
          icon: 'success',
          duration: 2000
        });
        
        // 更新全局订单数据状态，提示父页面刷新
        app.globalData.orderRefresh = true;
        
        // 2秒后返回
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        wx.showToast({
          title: res.message || '评价失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('提交评价失败:', err);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    }).finally(() => {
      that.setData({ submitting: false });
    });
  }
}); 