const app = getApp()

Page({
  data: {
    tabs: ['全部', '待付款', '待发货', '待收货', '已完成', '售后'],
    statusValues: ['all', 'pending_payment', 'pending_shipment', 'pending_receipt', 'completed', 'refund'],
    currentTab: 0,
    orders: [],
    loading: false,
    loadingMore: false,
    noMore: false,
    page: 1,
    limit: 10,
  },

  onLoad: function (options) {
    // 如果从外部跳转并指定了特定状态
    if (options.status) {
      const tabIndex = parseInt(options.status);
      if (tabIndex >= 0 && tabIndex < this.data.tabs.length) {
        this.setData({
          currentTab: tabIndex
        });
      }
    }
    this.loadOrders(true);
  },

  onShow: function () {
    // 页面显示时刷新订单列表
    if (app.globalData.orderRefresh) {
      this.loadOrders(true);
      app.globalData.orderRefresh = false;
    }
  },

  // 切换标签
  switchTab: function (e) {
    const tabIndex = e.currentTarget.dataset.index;
    if (tabIndex === this.data.currentTab) return;
    
    this.setData({
      currentTab: tabIndex,
      orders: [],
      page: 1,
      noMore: false
    });
    
    this.loadOrders(true);
  },

  // 加载订单数据
  loadOrders: function (refresh = false) {
    if (this.data.loading) return;
    
    const page = refresh ? 1 : this.data.page;
    const status = this.data.statusValues[this.data.currentTab];
    
    this.setData({
      loading: true,
      loadingMore: !refresh
    });
    
    let requestData = {
      page: page,
      limit: this.data.limit
    };
    
    // 对于"售后"分类，特殊处理，获取退款中和已退款的订单
    if (status === 'refund') {
      requestData.status = ['refunding', 'refunded'];
    } else if (status !== 'all') {
      requestData.status = status;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/order/list`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: requestData,
      success: (res) => {
        console.log('[ORDER] 获取订单列表响应:', res.data);
        
        if (res.data && res.data.success) {
          const newOrders = res.data.data.list || [];
          // 添加状态文本
          newOrders.forEach(order => {
            const statusMap = {
              'pending_payment': '待付款',
              'pending_shipment': '待发货',
              'pending_receipt': '待收货',
              'completed': '已完成',
              'cancelled': '已取消',
              'refunding': '退款中',
              'refunded': '已退款'
            };
            order.status_text = statusMap[order.status] || '未知状态';
          });
          
          this.setData({
            orders: refresh ? newOrders : [...this.data.orders, ...newOrders],
            page: page + 1,
            noMore: newOrders.length < this.data.limit
          });
          
          console.log('[ORDER] 处理后的订单列表:', this.data.orders);
        } else {
          wx.showToast({
            title: res.data.message || '加载订单失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('[ORDER] 请求订单列表失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          loading: false,
          loadingMore: false
        });
        
        // 停止下拉刷新
        wx.stopPullDownRefresh();
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadOrders(true);
  },

  // 上拉加载更多
  onReachBottom: function () {
    if (!this.data.noMore && !this.data.loading) {
      this.loadOrders();
    }
  },

  // 取消订单
  cancelOrder: function (e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '提示',
      content: '确认取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `${app.globalData.apiBaseUrl}/api/order/cancel/${orderId}`,
            method: 'POST',
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('token')}`
            },
            success: (res) => {
              console.log('[ORDER] 取消订单响应:', res.data);
              if (res.data && res.data.success) {
                wx.showToast({
                  title: '订单已取消',
                  icon: 'success'
                });
                // 重新加载订单
                this.loadOrders(true);
              } else {
                wx.showToast({
                  title: res.data.message || '取消订单失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('[ORDER] 取消订单请求失败:', err);
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 去支付
  goPay: function (e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/order/pay/${orderId}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        console.log('[ORDER] 支付订单响应:', res.data);
        if (res.data && res.data.success) {
          // 模拟支付成功
          wx.showLoading({
            title: '支付处理中',
          });
          
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '支付成功',
              icon: 'success',
              duration: 2000,
              success: () => {
                setTimeout(() => {
                  this.loadOrders(true);
                }, 2000);
              }
            });
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.message || '支付失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('[ORDER] 支付订单请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 确认收货
  confirmReceive: function (e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '提示',
      content: '确认已收到商品吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `${app.globalData.apiBaseUrl}/api/order/confirm/${orderId}`,
            method: 'POST',
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('token')}`
            },
            success: (res) => {
              console.log('[ORDER] 确认收货响应:', res.data);
              if (res.data && res.data.success) {
                wx.showToast({
                  title: '确认收货成功',
                  icon: 'success'
                });
                // 重新加载订单
                this.loadOrders(true);
              } else {
                wx.showToast({
                  title: res.data.message || '确认收货失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('[ORDER] 确认收货请求失败:', err);
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 去评价
  goReview: function (e) {
    const orderId = e.currentTarget.dataset.id;
    const orderItemId = e.currentTarget.dataset.itemId;
    
    console.log('[ORDER] 去评价:', { orderId, orderItemId });
    
    if (orderId && orderItemId) {
      // Store parameters in globalData as a backup
      app.globalData.pageParams = {
        orderItemId: parseInt(orderItemId),
        orderId: parseInt(orderId)
      };
      
      wx.navigateTo({
        url: `/pages/review/review?orderItemId=${orderItemId}&orderId=${orderId}`
      });
    } else {
      // If orderItemId is not provided, navigate to order detail first
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?id=${orderId}`
      });
    }
  },
  
  // 查看订单详情
  viewOrderDetail: function (e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${orderId}`
    });
  },

  // 跳转到首页去购物
  goShopping: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
}); 